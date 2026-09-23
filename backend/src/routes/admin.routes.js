const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const Order = require('../models/Order');
const VerificationCode = require('../models/VerificationCode');
const config = require('../config/env');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { currentPeriod, startOfToday } = require('../utils/wallet');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// pick a value from a row by any of several possible header spellings
function pick(row, keys) {
  for (const k of Object.keys(row)) {
    const norm = k.trim().toLowerCase().replace(/[\s_]+/g, '');
    if (keys.includes(norm)) return String(row[k]).trim();
  }
  return '';
}

//  List / filter users -
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      const rx = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [{ name: rx }, { loginId: rx }, { email: rx }];
    }
    const users = await User.find(filter).sort({ role: 1, name: 1 }).limit(500);
    res.json({ users });
  })
);

//  Add a single student 
router.post(
  '/students',
  asyncHandler(async (req, res) => {
    const loginId = String(req.body.loginId || '').trim().toLowerCase();
    if (!loginId || !req.body.name) {
      return res.status(400).json({ error: 'Name and ID are required' });
    }
    const password = String(req.body.password || config.defaultStudentPassword);
    const user = new User({
      name: req.body.name,
      loginId,
      email: req.body.email || '',
      role: 'student',
      block: req.body.block || '',
      phone: req.body.phone || '',
      mustResetPassword: true,
      points: {
        monthlyAllowance: config.monthlyAllowance,
        balance: config.monthlyAllowance,
        lastAllocated: currentPeriod(),
      },
    });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ user: user.toSafeJSON(), tempPassword: password });
  })
);

//  Add a chef (kitchen staff) --
router.post(
  '/chefs',
  asyncHandler(async (req, res) => {
    const loginId = String(req.body.loginId || '').trim().toLowerCase();
    if (!loginId || !req.body.name) {
      return res.status(400).json({ error: 'Name and ID are required' });
    }
    const password = String(req.body.password || config.defaultStudentPassword);
    const user = new User({
      name: req.body.name,
      loginId,
      email: req.body.email || '',
      role: 'chef',
      mustResetPassword: true,
    });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ user: user.toSafeJSON(), tempPassword: password });
  })
);

//  Bulk upload students from Excel -
// Accepts .xlsx/.csv with columns: Name, LoginId (or RegNo/ID), Email,
// Block, Phone, and optional Password. Missing passwords fall back to the
// default; every created student is forced to reset on first login.
router.post(
  '/students/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Attach an Excel or CSV file' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return res.status(400).json({ error: 'The sheet is empty' });

    const created = [];
    const skipped = [];

    for (const row of rows) {
      const name = pick(row, ['name', 'fullname', 'studentname']);
      const loginId = pick(row, ['loginid', 'regno', 'id', 'rollno', 'registrationno']).toLowerCase();
      if (!name || !loginId) {
        skipped.push({ row, reason: 'Missing name or ID' });
        continue;
      }
      const exists = await User.findOne({ loginId });
      if (exists) {
        skipped.push({ loginId, reason: 'Already exists' });
        continue;
      }
      const password = pick(row, ['password', 'pass']) || config.defaultStudentPassword;
      const user = new User({
        name,
        loginId,
        email: pick(row, ['email', 'mail']),
        role: 'student',
        block: pick(row, ['block', 'hostel', 'hostelblock']),
        phone: pick(row, ['phone', 'mobile', 'contact']),
        mustResetPassword: true,
        points: {
          monthlyAllowance: config.monthlyAllowance,
          balance: config.monthlyAllowance,
          lastAllocated: currentPeriod(),
        },
      });
      await user.setPassword(password);
      await user.save();
      created.push({ name, loginId, tempPassword: password });
    }

    res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
  })
);

//  Download an Excel template --
router.get(
  '/students/template',
  asyncHandler(async (req, res) => {
    const sample = [
      { Name: 'Aarav Kumar', LoginId: '24bca0005', Email: 'aarav@example.com', Block: 'B Block', Phone: '9876543210', Password: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="student-upload-template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  })
);

//  Reset a user's password to a temporary one 
router.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const password = String(req.body.password || config.defaultStudentPassword);
    await user.setPassword(password);
    user.mustResetPassword = true;
    await user.save();
    res.json({ ok: true, tempPassword: password });
  })
);

//  Enable / disable a user -
router.patch(
  '/users/:id/active',
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: !!req.body.active },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafeJSON() });
  })
);

//  Adjust a student's points balance 
router.post(
  '/users/:id/points',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    const delta = Number(req.body.delta);
    if (!Number.isFinite(delta)) return res.status(400).json({ error: 'Enter an amount' });
    user.points.balance = Math.max(0, user.points.balance + delta);
    await user.save();
    res.json({ user: user.toSafeJSON() });
  })
);

//  Run monthly allocation for all students now --
router.post(
  '/allocate',
  asyncHandler(async (req, res) => {
    const period = currentPeriod();
    const students = await User.find({ role: 'student' });
    let count = 0;
    for (const s of students) {
      const allowance = s.points.monthlyAllowance || config.monthlyAllowance;
      s.points.monthlyAllowance = allowance;
      s.points.balance = allowance;
      s.points.lastAllocated = period;
      await s.save();
      count += 1;
    }
    res.json({ ok: true, allocated: count, period });
  })
);

//  Dashboard / reports -
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const since = startOfToday();

    const [todayAgg, allAgg, statusAgg, topItems, studentCount, hourly] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
      User.countDocuments({ role: 'student', active: true }),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
        { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusCounts = {};
    statusAgg.forEach((s) => { statusCounts[s._id] = s.count; });

    res.json({
      today: todayAgg[0] || { revenue: 0, orders: 0 },
      allTime: allAgg[0] || { revenue: 0, orders: 0 },
      statusCounts,
      topItems: topItems.map((t) => ({ name: t._id, qty: t.qty })),
      activeStudents: studentCount,
      hourly: hourly.map((h) => ({ hour: h._id, orders: h.orders })),
    });
  })
);

//  Verification codes (admin only) -
// A safe view of a code for the admin table.
function codeView(c) {
  return {
    _id: c._id,
    code: c.code,
    status: c.status(),
    active: c.active,
    usedByLabel: c.usedByLabel || '',
    usedAt: c.usedAt,
    expiresAt: c.expiresAt,
    createdAt: c.createdAt,
  };
}

// List all codes, newest first.
router.get(
  '/codes',
  asyncHandler(async (req, res) => {
    const codes = await VerificationCode.find().sort({ createdAt: -1 }).limit(500);
    res.json({ codes: codes.map(codeView) });
  })
);

// Generate a new code. Optional { expiresInDays } to set an expiry.
router.post(
  '/codes',
  asyncHandler(async (req, res) => {
    let expiresAt = null;
    const days = Number(req.body.expiresInDays);
    if (Number.isFinite(days) && days > 0) {
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    const code = await VerificationCode.createUnique({ createdBy: req.user._id, expiresAt });
    res.status(201).json({ code: codeView(code) });
  })
);

// Activate / deactivate a code (cannot re-activate a used one).
router.patch(
  '/codes/:id',
  asyncHandler(async (req, res) => {
    const code = await VerificationCode.findById(req.params.id);
    if (!code) return res.status(404).json({ error: 'Code not found' });
    if (code.usedBy) return res.status(400).json({ error: 'A used code cannot be changed' });
    code.active = !!req.body.active;
    await code.save();
    res.json({ code: codeView(code) });
  })
);

// Delete / revoke a code.
router.delete(
  '/codes/:id',
  asyncHandler(async (req, res) => {
    await VerificationCode.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

module.exports = router;
