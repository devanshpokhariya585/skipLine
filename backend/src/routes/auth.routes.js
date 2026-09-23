const express = require('express');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const config = require('../config/env');
const { signToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { ensureMonthlyAllocation, walletSnapshot, currentPeriod } = require('../utils/wallet');
const { validateAll } = require('../utils/validate');

const router = express.Router();

// Build the payload the frontend keeps in memory after sign-in.
async function buildSession(user) {
  const safe = user.toSafeJSON();
  if (user.role === 'student') {
    safe.wallet = await walletSnapshot(user);
  }
  return safe;
}

// POST /api/auth/login  ->  { token, user }
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const loginId = String(req.body.loginId || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Enter your ID and password' });
    }

    const user = await User.findOne({ loginId }).select('+passwordHash');

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Incorrect ID or password' });
    }
    const ok = await user.verifyPassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect ID or password' });
    }

    await ensureMonthlyAllocation(user);
    const token = signToken(user);
    res.json({ token, user: await buildSession(user) });
  })
);

// GET /api/auth/me  ->  refreshed session (wallet re-checked)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureMonthlyAllocation(req.user);
    res.json({ user: await buildSession(req.user) });
  })
);

// POST /api/auth/password  { currentPassword, newPassword }
router.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    const ok = await user.verifyPassword(String(currentPassword || ''));
    if (!ok) return res.status(400).json({ error: 'Current password is wrong' });

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    await user.setPassword(String(newPassword));
    user.mustResetPassword = false;
    await user.save();
    res.json({ ok: true });
  })
);

// POST /api/auth/register  ->  self-service student registration
// Enforces every rule server-side and requires a valid admin code.
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const b = req.body || {};

    // 1) Validate every field on the server (never trust the client).
    const { values, errors, valid } = validateAll({
      name: ['name', b.name],
      regNo: ['regNo', b.regNo],
      email: ['vitEmail', b.email],
      phone: ['phone', b.phone],
      dob: ['dob', b.dob],
      gender: ['gender', b.gender],
      year: ['year', b.year],
      semester: ['semester', b.semester],
      branch: ['branch', b.branch],
      foodPreferences: ['foodPreferences', b.foodPreferences],
      password: ['password', b.password],
      declaration: ['declaration', b.declaration],
    });

    // Confirm password (frontend also checks, but enforce here too).
    if (values.password && b.confirmPassword !== b.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    const codeStr = String(b.verificationCode || '').trim().toUpperCase();
    if (!codeStr) errors.verificationCode = 'Verification code is required.';

    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });
    }

    // 2) loginId is the registration number the student enters.
    const loginId = values.regNo;

    // 3) Prevent duplicate registrations.
    const clashUser = await User.findOne({ $or: [{ loginId }, { email: values.email }] });
    if (clashUser) {
      const errs = {};
      if (clashUser.loginId === loginId) errs.regNo = 'This registration number is already registered.';
      if (clashUser.email === values.email) errs.email = 'This VIT email is already registered.';
      return res.status(409).json({ error: 'This account already exists.', errors: errs });
    }
    const clashPhone = await User.findOne({ phone: values.phone });
    if (clashPhone) {
      return res.status(409).json({
        error: 'This phone number is already registered.',
        errors: { phone: 'This phone number is already registered.' },
      });
    }

    // 4) Verify the code exists and is usable (server-side only).
    const codeDoc = await VerificationCode.findOne({ code: codeStr });
    if (!codeDoc || !codeDoc.isUsable()) {
      return res.status(400).json({
        error: 'Invalid or expired verification code.',
        errors: { verificationCode: 'Invalid or expired verification code. Please contact the administrator.' },
      });
    }

    // 5) Create the student.
    const user = new User({
      name: values.name,
      loginId,
      email: values.email,
      role: 'student',
      phone: values.phone,
      block: String(b.block || '').trim(),
      dob: values.dob,
      gender: values.gender,
      year: values.year,
      semester: values.semester,
      branch: values.branch,
      foodPreferences: values.foodPreferences,
      mustResetPassword: false,
      points: {
        monthlyAllowance: config.monthlyAllowance,
        balance: config.monthlyAllowance,
        lastAllocated: currentPeriod(),
      },
    });
    await user.setPassword(values.password);
    await user.save();

    // 6) Atomically claim the code so it can't be reused.
    const claimed = await VerificationCode.findOneAndUpdate(
      { _id: codeDoc._id, usedBy: null, active: true },
      { usedBy: user._id, usedByLabel: `${user.name} (${loginId})`, usedAt: new Date(), active: false },
      { new: true }
    );
    if (!claimed) {
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({
        error: 'That verification code was just used. Please contact the administrator.',
        errors: { verificationCode: 'Invalid or expired verification code. Please contact the administrator.' },
      });
    }

    // 7) Sign them in immediately.
    const token = signToken(user);
    res.status(201).json({ token, user: await buildSession(user) });
  })
);

module.exports = router;
