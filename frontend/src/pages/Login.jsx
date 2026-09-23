import React, { useState } from 'react';
import { ChefHat, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { PRODUCT } from '../lib/brand';

export default function Login({ mess, onRegister, onBack }) {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(loginId.trim(), password);
    } catch (err) {
      setError(err.message || 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-aside">
        <div className="login-brand">
          <span className="brand-mark lg"><ChefHat size={26} strokeWidth={1.75} /></span>
          <div>
            <b>{PRODUCT}</b>
            <small>{mess || 'Smart Canteen'}</small>
          </div>
        </div>
        <h1>Order ahead.<br />Skip the queue.</h1>
        <p>
          Spend your monthly points on meals, and pick up only once the kitchen
          marks your order ready. No waiting in line.
        </p>
        <div className="login-note">
          Students can create an account with a verification code from the mess
          office. Staff and admin accounts are created by the mess office.
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={submit}>
          {onBack && (
            <button type="button" className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Back</button>
          )}
          <h2>Sign in</h2>
          <p className="muted">Use your student / staff ID and password.</p>

          <label className="field">
            <span className="field-label">Student / staff ID</span>
            <input
              autoFocus
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. 24BCA0014"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            <LogIn size={17} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-switch">
            Don’t have an account?{' '}
            <button type="button" className="linkish" onClick={onRegister}>Create an account</button>
          </p>
        </form>
      </div>
    </div>
  );
}
