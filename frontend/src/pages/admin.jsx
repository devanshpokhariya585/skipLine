import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShoppingBag, IndianRupee, Users, Clock3, Plus, Upload, Download,
  KeyRound, Coins, UserPlus, RefreshCw, Pencil, Trash2, Power,
  Ticket, Copy, Ban, CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupees, points, timeAgo } from '../lib/format';
import { check } from '../lib/validation';
import { VegMark, Monogram, Badge, Spinner, Empty, StatCard, Field, Modal } from '../components/ui';
import ChangePassword from './ChangePassword';

const CATEGORIES = ['Starter', 'Main Course', 'South Indian', 'Snacks', 'Beverages', 'Dessert'];
const STATUS_LABEL = { placed: 'New', preparing: 'Preparing', ready: 'Ready', collected: 'Collected', cancelled: 'Cancelled' };

export default function Admin({ page }) {
  if (page === 'menu') return <MenuAdmin />;
  if (page === 'users') return <People />;
  if (page === 'codes') return <Codes />;
  if (page === 'orders') return <Orders />;
  if (page === 'reports') return <Reports />;
  if (page === 'account') return <Account />;
  return <Dashboard />;
}

/*  Dashboard  */
function Bars({ data, labelKey, valueKey, format }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="bars">
      <div className="bars-plot">
        {data.map((d, i) => (
          <div className="bar-col" key={i}>
            <div className="bar" style={{ height: `${(d[valueKey] / max) * 100}%` }}>
              <span className="bar-val">{format ? format(d[valueKey]) : d[valueKey]}</span>
            </div>
            <span className="bar-label">{d[labelKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const [r, setR] = useState(null);
  useEffect(() => { api.get('/admin/reports').then(setR).catch(() => setR(null)); }, []);
  if (!r) return <Spinner label="Loading dashboard" />;

  const hourly = (r.hourly || []).map((h) => ({
    label: `${((h.hour + 11) % 12) + 1}${h.hour < 12 ? 'a' : 'p'}`,
    orders: h.orders,
  }));

  return (
    <div className="stack">
      <div className="page-head"><div><h1>Overview</h1><p className="muted">Today’s canteen activity at a glance.</p></div></div>
      <div className="stats">
        <StatCard icon={ShoppingBag} value={r.today.orders} label="Orders today" accent />
        <StatCard icon={IndianRupee} value={rupees(r.today.revenue)} label="Points spent today" />
        <StatCard icon={Users} value={r.activeStudents} label="Active students" />
        <StatCard icon={Clock3} value={(r.statusCounts.placed || 0) + (r.statusCounts.preparing || 0)} label="Orders in progress" />
      </div>
      <div className="admin-grid">
        <div className="panel">
          <h3>Orders by hour</h3>
          {hourly.length ? <Bars data={hourly} labelKey="label" valueKey="orders" /> :
            <Empty title="No orders yet today" hint="This chart fills in as orders come in." />}
        </div>
        <div className="panel">
          <h3>Top items</h3>
          {r.topItems.length ? r.topItems.map((t) => (
            <div className="top-item" key={t.name}><span>{t.name}</span><b>{t.qty} sold</b></div>
          )) : <p className="muted">No sales recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

/*  Menu management  */
const BLANK = { name: '', category: 'Main Course', price: '', veg: true, description: '', available: true };

function MenuAdmin() {
  const { notify } = useAuth();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // object or null
  const load = useCallback(() => api.get('/menu').then((d) => setItems(d.items)).catch(() => setItems([])), []);
  useEffect(() => { load(); }, [load]);

  async function save(form) {
    const payload = { ...form, price: Number(form.price) };
    if (form._id) {
      await api.put(`/menu/${form._id}`, payload);
      notify(`${form.name} updated`);
    } else {
      await api.post('/menu', payload);
      notify(`${form.name} added to the menu`);
    }
    setEditing(null);
    load();
  }
  async function remove(item) {
    if (!confirm(`Remove ${item.name} from the menu?`)) return;
    await api.del(`/menu/${item._id}`);
    notify(`${item.name} removed`);
    load();
  }

  if (!items) return <Spinner label="Loading menu" />;
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Menu</h1><p className="muted">Add, edit and price the dishes students can order.</p></div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...BLANK })}><Plus size={16} /> Add dish</button>
      </div>
      <div className="panel table menu-table">
        <div className="tr th"><span>Dish</span><span>Category</span><span>Price</span><span>Diet</span><span>Status</span><span></span></div>
        {items.map((f) => (
          <div className="tr" key={f._id}>
            <span className="cell-name"><Monogram name={f.name} category={f.category} image={f.image} size="sm" /> <b>{f.name}</b></span>
            <span>{f.category}</span>
            <span>{rupees(f.price)}</span>
            <span><VegMark veg={f.veg} /></span>
            <span><Badge tone={f.available ? 'ok' : 'muted'}>{f.available ? 'Available' : 'Sold out'}</Badge></span>
            <span className="row-actions">
              <button className="icon-btn" onClick={() => setEditing(f)} aria-label="Edit"><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => remove(f)} aria-label="Remove"><Trash2 size={15} /></button>
            </span>
          </div>
        ))}
      </div>
      {editing && <MenuForm initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function MenuForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [fieldErr, setFieldErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErr[k]) setFieldErr((e) => ({ ...e, [k]: '' }));
  };
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }));

  const VALIDATORS = {
    name: () => check.dishName(form.name),
    price: () => check.price(form.price),
    image: () => check.imageUrl(form.image),
    description: () => check.description(form.description),
  };
  function localErr(k) {
    if (fieldErr[k]) return fieldErr[k];
    if (touched[k] && VALIDATORS[k]) return VALIDATORS[k]();
    return '';
  }
  const errNode = (k) => (localErr(k) ? <span className="field-error">{localErr(k)}</span> : null);
  const cls = (k) => `input-wrap ${localErr(k) ? 'has-err' : ''}`;

  async function submit(e) {
    e.preventDefault();
    setError('');
    const t = { name: true, price: true, image: true, description: true };
    setTouched(t);
    const errs = {};
    Object.keys(VALIDATORS).forEach((k) => { const m = VALIDATORS[k](); if (m) errs[k] = m; });
    if (Object.keys(errs).length) { setFieldErr(errs); setError('Please fix the highlighted fields.'); return; }

    setBusy(true);
    try {
      await onSave(form);
    } catch (err) {
      if (err.errors) { setFieldErr(err.errors); setError(err.message || 'Please fix the highlighted fields.'); }
      else setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={form._id ? 'Edit dish' : 'Add dish'} subtitle="These appear on the student menu." onClose={onClose}>
      <form className="form-grid" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field-label">Name</span>
          <div className={cls('name')}>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')} autoFocus placeholder="Chicken Fried Rice" />
          </div>
          {errNode('name')}
        </label>

        <label className="field">
          <span className="field-label">Price (points)</span>
          <div className={cls('price')}>
            <input type="number" min="0" step="0.5" value={form.price} onChange={(e) => set('price', e.target.value)} onBlur={() => blur('price')} placeholder="120" />
          </div>
          {errNode('price')}
        </label>

        <label className="field">
          <span className="field-label">Category</span>
          <div className="input-wrap">
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </label>

        <div className="field">
          <span className="field-label">Diet</span>
          <div className="radio-row">
            <label className={`radio ${form.veg ? 'checked' : ''}`}>
              <input type="radio" name="veg" checked={form.veg === true} onChange={() => set('veg', true)} />
              <span>Vegetarian</span>
            </label>
            <label className={`radio ${form.veg === false ? 'checked' : ''}`}>
              <input type="radio" name="veg" checked={form.veg === false} onChange={() => set('veg', false)} />
              <span>Non-Vegetarian</span>
            </label>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Image URL (optional)</span>
          <div className={cls('image')}>
            <input value={form.image || ''} onChange={(e) => set('image', e.target.value)} onBlur={() => blur('image')} placeholder="https://…" />
          </div>
          <span className="field-hint">Leave blank to show a lettered tile.</span>
          {errNode('image')}
        </label>

        <div className="field">
          <span className="field-label">Availability</span>
          <div className="radio-row">
            <label className={`radio ${form.available ? 'checked' : ''}`}>
              <input type="radio" name="available" checked={form.available === true} onChange={() => set('available', true)} />
              <span>Available</span>
            </label>
            <label className={`radio ${form.available === false ? 'checked' : ''}`}>
              <input type="radio" name="available" checked={form.available === false} onChange={() => set('available', false)} />
              <span>Sold Out</span>
            </label>
          </div>
        </div>

        <label className="field span-2">
          <span className="field-label">Description</span>
          <div className={cls('description')}>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} onBlur={() => blur('description')} />
          </div>
          {errNode('description')}
        </label>

        {error && <div className="form-error span-2">{error}</div>}
        <div className="form-foot span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save dish'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* People  */
function People() {
  const { notify } = useAuth();
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // 'student' | 'chef' | 'upload' | 'points'
  const [pointsTarget, setPointsTarget] = useState(null);
  const [result, setResult] = useState(null); // temp-password / upload results

  const load = useCallback(() => {
    const params = [];
    if (roleFilter !== 'all') params.push(`role=${roleFilter}`);
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    api.get(`/admin/users${params.length ? `?${params.join('&')}` : ''}`).then((d) => setUsers(d.users)).catch(() => setUsers([]));
  }, [roleFilter, q]);
  useEffect(() => { load(); }, [load]);

  async function resetPw(u) {
    if (!confirm(`Reset password for ${u.name}?`)) return;
    const { tempPassword } = await api.post(`/admin/users/${u._id}/reset-password`, {});
    setResult({ title: `Temporary password for ${u.name}`, rows: [{ loginId: u.loginId, tempPassword }] });
  }
  async function toggleActive(u) {
    await api.patch(`/admin/users/${u._id}/active`, { active: !u.active });
    notify(u.active ? `${u.name} disabled` : `${u.name} enabled`);
    load();
  }
  async function allocate() {
    if (!confirm('Reset every student’s balance to this month’s allowance now?')) return;
    const { allocated } = await api.post('/admin/allocate', {});
    notify(`Allocated to ${allocated} students`);
  }

  if (!users) return <Spinner label="Loading people" />;

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>People</h1><p className="muted">Students and kitchen staff registered with the mess.</p></div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={allocate}><Coins size={15} /> Run allocation</button>
          <button className="btn btn-ghost" onClick={() => setModal('chef')}><UserPlus size={15} /> Add chef</button>
          <button className="btn btn-ghost" onClick={() => setModal('upload')}><Upload size={15} /> Import Excel</button>
          <button className="btn btn-primary" onClick={() => setModal('student')}><Plus size={16} /> Add student</button>
        </div>
      </div>

      <div className="filters">
        <div className="chips">
          {[['all', 'Everyone'], ['student', 'Students'], ['chef', 'Kitchen'], ['admin', 'Owners']].map(([v, l]) => (
            <button key={v} className={roleFilter === v ? 'chip active' : 'chip'} onClick={() => setRoleFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID" />
        </div>
      </div>

      <div className="panel table people-table">
        <div className="tr th"><span>Name</span><span>ID</span><span>Role</span><span>Balance</span><span>Status</span><span></span></div>
        {users.map((u) => (
          <div className="tr" key={u._id}>
            <span className="cell-name"><span className="avatar sm">{u.name.slice(0, 1).toUpperCase()}</span> <b>{u.name}</b></span>
            <span className="mono">{u.loginId}</span>
            <span className="cap">{u.role}</span>
            <span>{u.role === 'student' ? points(u.points?.balance || 0) : '-'}</span>
            <span><Badge tone={u.active ? 'ok' : 'muted'}>{u.active ? 'Active' : 'Disabled'}</Badge></span>
            <span className="row-actions">
              {u.role === 'student' && (
                <button className="icon-btn" title="Adjust points" onClick={() => { setPointsTarget(u); setModal('points'); }}><Coins size={15} /></button>
              )}
              <button className="icon-btn" title="Reset password" onClick={() => resetPw(u)}><KeyRound size={15} /></button>
              <button className="icon-btn" title={u.active ? 'Disable' : 'Enable'} onClick={() => toggleActive(u)}><Power size={15} /></button>
            </span>
          </div>
        ))}
      </div>

      {modal === 'student' && <PersonForm role="student" onClose={() => setModal(null)} onDone={(res) => { setModal(null); setResult(res); load(); }} />}
      {modal === 'chef' && <PersonForm role="chef" onClose={() => setModal(null)} onDone={(res) => { setModal(null); setResult(res); load(); }} />}
      {modal === 'upload' && <UploadForm onClose={() => setModal(null)} onDone={(res) => { setModal(null); setResult(res); load(); }} />}
      {modal === 'points' && pointsTarget && (
        <PointsForm user={pointsTarget} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function PersonForm({ role, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', loginId: '', email: '', block: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.loginId) return setError('Name and ID are required');
    setBusy(true);
    try {
      const { user, tempPassword } = await api.post(role === 'chef' ? '/admin/chefs' : '/admin/students', form);
      onDone({ title: `${role === 'chef' ? 'Chef' : 'Student'} added`, rows: [{ loginId: user.loginId, tempPassword }] });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={role === 'chef' ? 'Add chef' : 'Add student'} subtitle="They sign in with the ID and password shown next." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Full name"><input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
        <Field label={role === 'chef' ? 'Staff ID' : 'Reg. number / ID'}><input value={form.loginId} onChange={(e) => set('loginId', e.target.value)} /></Field>
        <Field label="Email (optional)"><input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        {role === 'student' && <Field label="Block (optional)"><input value={form.block} onChange={(e) => set('block', e.target.value)} /></Field>}
        {role === 'student' && <Field label="Phone (optional)"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>}
        <Field label="Password (optional)" hint="Leave blank to use the default; they’ll reset on first login.">
          <input value={form.password} onChange={(e) => set('password', e.target.value)} />
        </Field>
        {error && <div className="form-error span-2">{error}</div>}
        <div className="form-foot span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UploadForm({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function downloadTemplate() {
    const blob = await api.getBlob('/admin/students/template');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'student-upload-template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Choose an Excel or CSV file first');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/admin/students/upload', fd);
      onDone({
        title: `${res.createdCount} student${res.createdCount === 1 ? '' : 's'} added${res.skippedCount ? `, ${res.skippedCount} skipped` : ''}`,
        rows: res.created.map((c) => ({ loginId: c.loginId, tempPassword: c.tempPassword })),
        skipped: res.skipped,
      });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title="Import students from Excel" subtitle="Upload a sheet with columns: Name, LoginId, Email, Block, Phone (Password optional)." onClose={onClose}>
      <form onSubmit={submit} className="stack-sm">
        <button type="button" className="btn btn-ghost" onClick={downloadTemplate}><Download size={15} /> Download template</button>
        <label className="dropzone">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files[0])} hidden />
          <Upload size={22} strokeWidth={1.5} />
          <span>{file ? file.name : 'Choose a .xlsx or .csv file'}</span>
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="form-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Importing…' : 'Import students'}</button>
        </div>
      </form>
    </Modal>
  );
}

function PointsForm({ user, onClose, onDone }) {
  const { notify } = useAuth();
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    await api.post(`/admin/users/${user._id}/points`, { delta: Number(delta) });
    notify(`Balance updated for ${user.name}`);
    onDone();
  }
  return (
    <Modal title={`Adjust points - ${user.name}`} subtitle={`Current balance: ${points(user.points?.balance || 0)}`} onClose={onClose}>
      <form onSubmit={submit} className="stack-sm">
        <Field label="Amount" hint="Use a negative number to deduct, e.g. -200.">
          <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus placeholder="e.g. 500 or -200" />
        </Field>
        <div className="form-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || delta === ''}>Apply</button>
        </div>
      </form>
    </Modal>
  );
}

function ResultModal({ result, onClose }) {
  return (
    <Modal title={result.title} subtitle="Share these temporary passwords securely. Everyone resets on first login." onClose={onClose} wide>
      {result.rows.length > 0 ? (
        <div className="panel table cred-table">
          <div className="tr th"><span>Login ID</span><span>Temporary password</span></div>
          {result.rows.map((r, i) => (
            <div className="tr" key={i}><span className="mono">{r.loginId}</span><span className="mono">{r.tempPassword}</span></div>
          ))}
        </div>
      ) : <p className="muted">No new accounts were created.</p>}
      {result.skipped && result.skipped.length > 0 && (
        <p className="fineprint">{result.skipped.length} row(s) skipped (already existed or missing name/ID).</p>
      )}
      <div className="form-foot"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
    </Modal>
  );
}

/*  Verification codes -- */
function Codes() {
  const { notify } = useAuth();
  const [codes, setCodes] = useState(null);
  const [expiry, setExpiry] = useState('0'); // days; 0 = never
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/admin/codes').then((d) => setCodes(d.codes)).catch(() => setCodes([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    try {
      const days = Number(expiry);
      const { code } = await api.post('/admin/codes', days > 0 ? { expiresInDays: days } : {});
      notify(`Code ${code.code} generated`);
      load();
    } catch (err) { notify(err.message, 'error'); }
    finally { setBusy(false); }
  }
  async function toggle(c) {
    try { await api.patch(`/admin/codes/${c._id}`, { active: !c.active }); load(); }
    catch (err) { notify(err.message, 'error'); }
  }
  async function remove(c) {
    if (!confirm(`Delete code ${c.code}?`)) return;
    await api.del(`/admin/codes/${c._id}`);
    notify(`Code ${c.code} deleted`);
    load();
  }
  async function copy(c) {
    try { await navigator.clipboard.writeText(c.code); notify(`${c.code} copied`); }
    catch { notify('Copy not available', 'error'); }
  }

  const toneFor = (s) => (s === 'active' ? 'ok' : s === 'used' ? 'info' : 'warn');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  if (!codes) return <Spinner label="Loading codes" />;

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Verification codes</h1><p className="muted">Students need an active code to register. Each code works once.</p></div>
        <div className="head-actions">
          <select className="mini-select" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            <option value="0">No expiry</option>
            <option value="7">Expires in 7 days</option>
            <option value="30">Expires in 30 days</option>
          </select>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn btn-primary" onClick={generate} disabled={busy}>
            <Plus size={16} /> {busy ? 'Generating…' : 'Generate code'}
          </button>
        </div>
      </div>

      {codes.length === 0 ? (
        <Empty title="No codes yet" hint="Generate a code and share it with a student so they can register."
          action={generate} actionLabel="Generate code" />
      ) : (
        <div className="panel table codes-table">
          <div className="tr th"><span>Code</span><span>Status</span><span>Used by</span><span>Created</span><span>Expires</span><span></span></div>
          {codes.map((c) => (
            <div className="tr" key={c._id}>
              <span className="mono code-cell">
                <Ticket size={14} /> {c.code}
              </span>
              <span><Badge tone={toneFor(c.status)}>{cap(c.status)}</Badge></span>
              <span className="clip">{c.usedByLabel || '-'}</span>
              <span>{timeAgo(c.createdAt)}</span>
              <span>{c.expiresAt ? timeAgo(c.expiresAt) : 'Never'}</span>
              <span className="row-actions">
                <button className="icon-btn" title="Copy code" onClick={() => copy(c)}><Copy size={15} /></button>
                {c.status !== 'used' && (
                  <button className="icon-btn" title={c.active ? 'Deactivate' : 'Activate'} onClick={() => toggle(c)}>
                    {c.active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                )}
                <button className="icon-btn danger" title="Delete" onClick={() => remove(c)}><Trash2 size={15} /></button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -- Orders - */
function Orders() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('');
  const load = useCallback(() => {
    api.get(`/orders${status ? `?status=${status}` : ''}`).then((d) => setOrders(d.orders)).catch(() => setOrders([]));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Orders</h1><p className="muted">Every order across the canteen.</p></div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className="chips">
        {[['', 'All'], ['placed', 'New'], ['preparing', 'Preparing'], ['ready', 'Ready'], ['collected', 'Collected'], ['cancelled', 'Cancelled']].map(([v, l]) => (
          <button key={v} className={status === v ? 'chip active' : 'chip'} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      {!orders ? <Spinner /> : orders.length === 0 ? <Empty title="No orders here" /> : (
        <div className="panel table order-table">
          <div className="tr th"><span>Order</span><span>Student</span><span>Items</span><span>Total</span><span>When</span><span>Status</span></div>
          {orders.map((o) => (
            <div className="tr" key={o._id}>
              <span className="mono">#{o.orderNo}</span>
              <span>{o.studentName}</span>
              <span className="clip">{o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</span>
              <span>{rupees(o.total)}</span>
              <span>{timeAgo(o.createdAt)}</span>
              <span><Badge tone={o.status === 'collected' ? 'ok' : o.status === 'cancelled' ? 'muted' : 'warn'}>{STATUS_LABEL[o.status]}</Badge></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -- Reports  */
function Reports() {
  const [r, setR] = useState(null);
  useEffect(() => { api.get('/admin/reports').then(setR).catch(() => setR(null)); }, []);
  if (!r) return <Spinner label="Loading reports" />;
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Reports</h1><p className="muted">Demand and points spent across the mess.</p></div></div>
      <div className="stats">
        <StatCard icon={ShoppingBag} value={r.allTime.orders} label="Orders all-time" />
        <StatCard icon={IndianRupee} value={rupees(r.allTime.revenue)} label="Points spent all-time" accent />
        <StatCard icon={ShoppingBag} value={r.today.orders} label="Orders today" />
        <StatCard icon={IndianRupee} value={rupees(r.today.revenue)} label="Spent today" />
      </div>
      <div className="admin-grid">
        <div className="panel">
          <h3>Top items</h3>
          {r.topItems.length ? r.topItems.map((t) => (
            <div className="top-item" key={t.name}><span>{t.name}</span><b>{t.qty} sold</b></div>
          )) : <p className="muted">No sales yet.</p>}
        </div>
        <div className="panel">
          <h3>Orders by status</h3>
          {Object.entries(r.statusCounts).length ? Object.entries(r.statusCounts).map(([s, c]) => (
            <div className="top-item" key={s}><span className="cap">{STATUS_LABEL[s] || s}</span><b>{c}</b></div>
          )) : <p className="muted">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Account() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Account</h1><p className="muted">Mess owner sign-in.</p></div></div>
      <div className="account-grid">
        <div className="panel">
          <h3>Profile</h3>
          <dl className="detail">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Login</dt><dd className="mono">{user.loginId}</dd></div>
            <div><dt>Role</dt><dd>Mess owner</dd></div>
          </dl>
        </div>
        <ChangePassword />
      </div>
    </div>
  );
}
