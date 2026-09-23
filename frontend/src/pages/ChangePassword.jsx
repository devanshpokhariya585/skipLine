import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Field } from '../components/ui';

// forced=true renders the full-screen first-login gate.
export default function ChangePassword({ forced = false }) {
  const { refresh, logout, notify } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError('New passwords do not match');
    if (next.length < 6) return setError('Use at least 6 characters');
    setBusy(true);
    try {
      await api.post('/auth/password', { currentPassword: current, newPassword: next });
      await refresh();
      notify('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form className="pw-form" onSubmit={submit}>
      <Field label="Current password">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </Field>
      <Field label="New password" hint="At least 6 characters">
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>
      {error && <div className="form-error">{error}</div>}
      <button className="btn btn-primary" disabled={busy}>
        <KeyRound size={16} />
        {busy ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );

  if (forced) {
    return (
      <div className="login">
        <div className="login-panel center">
          <div className="login-card">
            <span className="gate-icon"><ShieldCheck size={24} /></span>
            <h2>Set a new password</h2>
            <p className="muted">
              You’re signing in with a temporary password. Choose your own to continue.
            </p>
            {form}
            <button className="linkish" onClick={logout}>Sign in as someone else</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel pw-panel">
      <h3>Change password</h3>
      <p className="muted">Update the password you use to sign in.</p>
      {form}
    </div>
  );
}
