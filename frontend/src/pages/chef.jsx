import React, { useEffect, useState, useCallback } from 'react';
import { Bell, ChefHat, PackageCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupees, timeAgo } from '../lib/format';
import { VegMark, Monogram, Badge, Spinner, Empty, StatCard } from '../components/ui';
import ChangePassword from './ChangePassword';

const NEXT_LABEL = { placed: 'Start preparing', preparing: 'Mark ready', ready: 'Mark collected' };
const STATUS_LABEL = { placed: 'New', preparing: 'Preparing', ready: 'Ready', collected: 'Collected', cancelled: 'Cancelled' };

export default function Chef({ page }) {
  if (page === 'orders') return <Orders />;
  if (page === 'availability') return <Availability />;
  if (page === 'account') return <Account />;
  return <Dashboard />;
}

function useOrders() {
  const [orders, setOrders] = useState(null);
  const load = useCallback(() => {
    api.get('/orders?active=true').then((d) => setOrders(d.orders)).catch(() => setOrders([]));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
  }, [load]);
  return { orders, setOrders, load };
}

function OrderBoard({ orders, onAdvance, onCancel }) {
  if (!orders) return <Spinner label="Loading orders" />;
  if (!orders.length) return <Empty title="No active orders" hint="New orders will appear here as students place them." />;
  return (
    <div className="orders">
      {orders.map((o) => (
        <div className="order-card" key={o._id}>
          <div className="order-head">
            <span className="order-no">#{o.orderNo}</span>
            <span className="order-who">{o.studentName}{o.block ? ` · ${o.block}` : ''}</span>
            <Badge tone={o.status === 'ready' ? 'ok' : o.status === 'placed' ? 'info' : 'warn'}>{STATUS_LABEL[o.status]}</Badge>
          </div>
          <ul className="order-items">
            {o.items.map((i, n) => (
              <li key={n}><span className="qtytag">{i.qty}×</span> {i.name}</li>
            ))}
          </ul>
          {o.note && <p className="order-note">“{o.note}”</p>}
          <div className="order-foot">
            <span className="muted">{timeAgo(o.createdAt)}</span>
            <b>{rupees(o.total)}</b>
          </div>
          <div className="order-actions">
            {NEXT_LABEL[o.status] && (
              <button className="btn btn-primary btn-sm" onClick={() => onAdvance(o)}>{NEXT_LABEL[o.status]}</button>
            )}
            {o.status !== 'ready' && (
              <button className="btn btn-ghost btn-sm" onClick={() => onCancel(o)}>Cancel</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const { notify } = useAuth();
  const { orders, load } = useOrders();

  const counts = {
    placed: (orders || []).filter((o) => o.status === 'placed').length,
    preparing: (orders || []).filter((o) => o.status === 'preparing').length,
    ready: (orders || []).filter((o) => o.status === 'ready').length,
  };

  async function advance(o) {
    await api.patch(`/orders/${o._id}/status`, {});
    notify(o.status === 'preparing' ? `#${o.orderNo} marked ready - student notified` : `#${o.orderNo} updated`);
    load();
  }
  async function cancel(o) {
    await api.patch(`/orders/${o._id}/status`, { status: 'cancelled' });
    notify(`#${o.orderNo} cancelled, points refunded`);
    load();
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Kitchen</h1><p className="muted">Keep orders moving and students informed.</p></div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className="stats">
        <StatCard icon={Bell} value={counts.placed} label="New orders" accent />
        <StatCard icon={ChefHat} value={counts.preparing} label="Preparing" />
        <StatCard icon={PackageCheck} value={counts.ready} label="Ready for pickup" />
      </div>
      <div className="section-head"><h3>Active orders</h3></div>
      <OrderBoard orders={orders} onAdvance={advance} onCancel={cancel} />
    </div>
  );
}

function Orders() {
  const { notify } = useAuth();
  const { orders, load } = useOrders();
  async function advance(o) { await api.patch(`/orders/${o._id}/status`, {}); notify(`#${o.orderNo} updated`); load(); }
  async function cancel(o) { await api.patch(`/orders/${o._id}/status`, { status: 'cancelled' }); notify(`#${o.orderNo} cancelled, points refunded`); load(); }
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Orders</h1><p className="muted">Every order still in progress.</p></div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      <OrderBoard orders={orders} onAdvance={advance} onCancel={cancel} />
    </div>
  );
}

function Availability() {
  const { notify } = useAuth();
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/menu').then((d) => setItems(d.items)).catch(() => setItems([])); }, []);

  async function toggle(item) {
    const { item: updated } = await api.patch(`/menu/${item._id}/availability`, { available: !item.available });
    setItems((list) => list.map((i) => (i._id === item._id ? updated : i)));
    notify(updated.available ? `${updated.name} is back on the menu` : `${updated.name} marked sold out`);
  }

  if (!items) return <Spinner label="Loading menu" />;
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Availability</h1><p className="muted">Turn a dish off when it runs out. Students can’t order sold-out items.</p></div></div>
      <div className="panel list">
        {items.map((f) => (
          <div className="avail-row" key={f._id}>
            <Monogram name={f.name} category={f.category} image={f.image} size="sm" />
            <div className="grow">
              <b>{f.name}</b>
              <small>{rupees(f.price)} · {f.category}</small>
            </div>
            <VegMark veg={f.veg} />
            <label className="switch">
              <input type="checkbox" checked={f.available} onChange={() => toggle(f)} />
              <span />
            </label>
            <span className={`avail-state ${f.available ? '' : 'off'}`}>{f.available ? 'Available' : 'Sold out'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Account() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Account</h1><p className="muted">Your kitchen sign-in.</p></div></div>
      <div className="account-grid">
        <div className="panel">
          <h3>Profile</h3>
          <dl className="detail">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Staff ID</dt><dd className="mono">{user.loginId}</dd></div>
            <div><dt>Role</dt><dd>Kitchen staff</dd></div>
          </dl>
        </div>
        <ChangePassword />
      </div>
    </div>
  );
}
