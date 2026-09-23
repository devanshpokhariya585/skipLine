import React, { useMemo, useState } from 'react';
import { ChefHat, UserPlus, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { PRODUCT } from '../lib/brand';
import { check, ageFrom, passwordChecks } from '../lib/validation';

const FALLBACK = {
  genders: ['Male', 'Female', 'Other', 'Prefer not to say'],
  years: [1, 2, 3, 4],
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
  branches: ['BCA', 'BCA Data Science', 'CSE', 'CSE Data Science', 'ECE', 'EEE', 'IT', 'Mechanical', 'Civil', 'B.Com', 'BBA', 'B.Sc', 'Other'],
  foodPreferences: ['North Indian', 'South Indian', 'Continental', 'Chinese', 'American', 'Mexican', 'Italian', 'Jain'],
};

const FIELDS = ['name', 'dob', 'gender', 'regNo', 'email', 'phone', 'year', 'semester', 'branch', 'foodPreferences', 'password', 'confirmPassword', 'declaration', 'verificationCode'];

export default function Register({ cfg, onLogin, onBack }) {
  const { register, notify } = useAuth();
  const opts = { ...FALLBACK, ...(cfg || {}) };

  const [v, setV] = useState({
    name: '', dob: '', gender: '', regNo: '', email: '', phone: '',
    year: '', semester: '', branch: '', block: '', foodPreferences: [],
    password: '', confirmPassword: '', declaration: false, verificationCode: '',
  });
  const [touched, setTouched] = useState({});
  const [serverErr, setServerErr] = useState({});
  const [topError, setTopError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const age = useMemo(() => ageFrom(v.dob), [v.dob]);

  // Local validation for one field.
  function localError(field) {
    if (field === 'confirmPassword') {
      if (!v.confirmPassword) return 'Please confirm your password.';
      return v.confirmPassword === v.password ? '' : 'Passwords do not match.';
    }
    const fn = check[field];
    return fn ? fn(v[field]) : '';
  }

  // Error to display: server error (until edited) or local error once touched.
  function errorFor(field) {
    if (serverErr[field]) return serverErr[field];
    if (touched[field]) return localError(field);
    return '';
  }

  const set = (field, val) => {
    setV((s) => ({ ...s, [field]: val }));
    if (serverErr[field]) setServerErr((s) => ({ ...s, [field]: '' }));
  };
  const blur = (field) => setTouched((s) => ({ ...s, [field]: true }));

  const togglePref = (f) => {
    setTouched((s) => ({ ...s, foodPreferences: true }));
    setV((s) => {
      const has = s.foodPreferences.includes(f);
      return { ...s, foodPreferences: has ? s.foodPreferences.filter((x) => x !== f) : [...s.foodPreferences, f] };
    });
    if (serverErr.foodPreferences) setServerErr((s) => ({ ...s, foodPreferences: '' }));
  };

  const pwChecks = passwordChecks(v.password);

  async function submit(e) {
    e.preventDefault();
    setTopError('');
    // validate everything
    const allTouched = {};
    FIELDS.forEach((f) => { allTouched[f] = true; });
    setTouched(allTouched);
    const errs = {};
    FIELDS.forEach((f) => { const m = localError(f); if (m) errs[f] = m; });
    if (Object.keys(errs).length) {
      setServerErr(errs);
      setTopError('Please fix the highlighted fields.');
      return;
    }

    setBusy(true);
    try {
      await register({
        name: v.name,
        regNo: v.regNo,
        email: v.email,
        phone: v.phone,
        dob: v.dob,
        gender: v.gender,
        year: v.year,
        semester: v.semester,
        branch: v.branch,
        block: v.block,
        foodPreferences: v.foodPreferences,
        password: v.password,
        confirmPassword: v.confirmPassword,
        declaration: v.declaration,
        verificationCode: v.verificationCode,
      });
      notify('Welcome to ' + PRODUCT + '! Your account is ready.');
      // On success the auth context sets the user and the app routes to the dashboard.
    } catch (err) {
      if (err.errors) {
        setServerErr(err.errors);
        setTopError(err.message || 'Please fix the highlighted fields.');
      } else {
        setTopError(err.message || 'Could not create your account.');
      }
      setBusy(false);
    }
  }

  const err = (f) => {
    const m = errorFor(f);
    return m ? <span className="field-error">{m}</span> : null;
  };
  const cls = (f) => `input-wrap ${errorFor(f) ? 'has-err' : ''}`;

  return (
    <div className="auth-page">
      <div className="auth-card auth-wide">
        <button className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="auth-head">
          <span className="brand-mark lg"><ChefHat size={24} strokeWidth={1.75} /></span>
          <h2>Create your {PRODUCT} account</h2>
          <p className="muted">Register with the verification code from your mess office.</p>
        </div>

        <form onSubmit={submit} noValidate>
          <h4 className="form-section">Personal information</h4>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Full name</span>
              <div className={cls('name')}>
                <input value={v.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')} placeholder="Devansh Pokhariya" autoComplete="name" />
              </div>
              {err('name')}
            </label>

            <label className="field">
              <span className="field-label">Date of birth</span>
              <div className={cls('dob')}>
                <input type="date" value={v.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dob', e.target.value)} onBlur={() => blur('dob')} />
              </div>
              {age != null && age >= 0 && !errorFor('dob') && <span className="field-hint age-hint">Age: {age} years</span>}
              {err('dob')}
            </label>

            <div className="field span-2">
              <span className="field-label">Gender</span>
              <div className={`radio-row ${errorFor('gender') ? 'has-err' : ''}`}>
                {opts.genders.map((g) => (
                  <label key={g} className={`radio ${v.gender === g ? 'checked' : ''}`}>
                    <input type="radio" name="gender" value={g} checked={v.gender === g} onChange={(e) => { set('gender', e.target.value); blur('gender'); }} />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
              {err('gender')}
            </div>
          </div>

          <h4 className="form-section">Student details</h4>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Registration number</span>
              <div className={cls('regNo')}>
                <input value={v.regNo} onChange={(e) => set('regNo', e.target.value.toUpperCase())} onBlur={() => blur('regNo')} placeholder="24BCA0014" />
              </div>
              <span className="field-hint">You’ll sign in with this ID.</span>
              {err('regNo')}
            </label>

            <label className="field">
              <span className="field-label">Phone number</span>
              <div className={cls('phone')}>
                <input inputMode="numeric" value={v.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => blur('phone')} placeholder="9876543210" autoComplete="tel" />
              </div>
              {err('phone')}
            </label>

            <label className="field span-2">
              <span className="field-label">VIT email</span>
              <div className={cls('email')}>
                <input value={v.email} onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')} placeholder="devansh.pokhariya2024@vitstudent.ac.in" autoComplete="email" />
              </div>
              {err('email')}
            </label>

            <label className="field">
              <span className="field-label">Branch</span>
              <div className={cls('branch')}>
                <select value={v.branch} onChange={(e) => { set('branch', e.target.value); blur('branch'); }}>
                  <option value="">Select branch</option>
                  {opts.branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {err('branch')}
            </label>

            <label className="field">
              <span className="field-label">Year</span>
              <div className={cls('year')}>
                <select value={v.year} onChange={(e) => { set('year', e.target.value); blur('year'); }}>
                  <option value="">Select year</option>
                  {opts.years.map((y) => <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : `${y}th`} Year</option>)}
                </select>
              </div>
              {err('year')}
            </label>

            <label className="field">
              <span className="field-label">Semester</span>
              <div className={cls('semester')}>
                <select value={v.semester} onChange={(e) => { set('semester', e.target.value); blur('semester'); }}>
                  <option value="">Select semester</option>
                  {opts.semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              {err('semester')}
            </label>

            <label className="field">
              <span className="field-label">Hostel block (optional)</span>
              <div className="input-wrap">
                <input value={v.block} onChange={(e) => set('block', e.target.value)} placeholder="e.g. A Block" />
              </div>
            </label>
          </div>

          <h4 className="form-section">Food preferences</h4>
          <div className="field">
            <span className="field-label">Select the cuisines you enjoy</span>
            <div className={`check-grid ${errorFor('foodPreferences') ? 'has-err' : ''}`}>
              {opts.foodPreferences.map((f) => {
                const on = v.foodPreferences.includes(f);
                return (
                  <label key={f} className={`checkbox ${on ? 'checked' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => togglePref(f)} />
                    <span>{f}</span>
                  </label>
                );
              })}
            </div>
            {err('foodPreferences')}
          </div>

          <h4 className="form-section">Security</h4>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Password</span>
              <div className={cls('password')}>
                <input type={showPw ? 'text' : 'password'} value={v.password} onChange={(e) => set('password', e.target.value)} onBlur={() => blur('password')} autoComplete="new-password" />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="Show password">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {err('password')}
            </label>

            <label className="field">
              <span className="field-label">Confirm password</span>
              <div className={cls('confirmPassword')}>
                <input type={showCpw ? 'text' : 'password'} value={v.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} onBlur={() => blur('confirmPassword')} autoComplete="new-password" />
                <button type="button" className="pw-toggle" onClick={() => setShowCpw((s) => !s)} aria-label="Show password">
                  {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {err('confirmPassword')}
            </label>

            <ul className="pw-checks span-2">
              {pwChecks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : ''}>
                  {c.ok ? <Check size={14} /> : <X size={14} />}<span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <h4 className="form-section">Verification</h4>
          <label className="field">
            <span className="field-label">Verification code</span>
            <div className={cls('verificationCode')}>
              <input value={v.verificationCode} onChange={(e) => set('verificationCode', e.target.value.toUpperCase())} onBlur={() => blur('verificationCode')} placeholder="SKP-XXXXXX" />
            </div>
            <span className="field-hint">Enter the code provided by the administrator.</span>
            {err('verificationCode')}
          </label>

          <label className={`declaration ${errorFor('declaration') ? 'has-err' : ''}`}>
            <input type="checkbox" checked={v.declaration} onChange={(e) => { set('declaration', e.target.checked); blur('declaration'); }} />
            <span>I promise that all the details I have provided are correct and complete.</span>
          </label>
          {err('declaration')}

          {topError && <div className="form-error" style={{ marginTop: 16 }}>{topError}</div>}

          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>
            <UserPlus size={17} />
            {busy ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="auth-switch">
            Already have an account?{' '}
            <button type="button" className="linkish" onClick={onLogin}>Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}
