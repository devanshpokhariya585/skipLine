import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, Plus, Minus, ShoppingBag, Wallet, ArrowRight, CircleDot,
  CheckCircle2, Clock3, PackageCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupees, points, timeAgo, clockTime } from '../lib/format';
import { VegMark, Monogram, Badge, Spinner, Empty, Field } from '../components/ui';
import ChangePassword from './ChangePassword';

const CATEGORIES = ['All', 'Main Course', 'South Indian', 'Snacks', 'Beverages'];
const STATUS_FLOW = ['placed', 'preparing', 'ready', 'collected'];
const STATUS_LABEL = {
  placed: 'Order received', preparing: 'Preparing', ready: 'Ready for pickup',
  collected: 'Collected', cancelled: 'Cancelled',
};

function periodLabel(period) {
  if (!period) return '';
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function Student({ page, setPage, cart, setCart }) {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    api.get('/menu').then((d) => setMenu(d.items)).catch(() => setMenu([]));
  }, []);

  const addToCart = useCallback((food) => {
    setCart((c) => {
      const found = c.find((i) => i._id === food._id);
      if (found) return c.map((i) => (i._id === food._id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...food, qty: 1 }];
    });
  }, [setCart]);

  if (page === 'menu') return <Menu menu={menu} addToCart={addToCart} />;
  if (page === 'cart') return <Cart cart={cart} setCart={setCart} setPage={setPage} />;
  if (page === 'orders') return <OrderStatus setPage={setPage} />;
  if (page === 'history') return <History />;
  if (page === 'account') return <Account />;
  return <Dashboard menu={menu} addToCart={addToCart} setPage={setPage} />;
}

/* -- Wallet - */
function WalletCard({ wallet }) {
  if (!wallet) return null;
  const usedPct = Math.min(100, Math.round((wallet.spentToday / wallet.dailyLimit) * 100));
  return (
    <div className="wallet">
      <div className="wallet-main">
        <span className="wallet-label">Points balance</span>
        <div className="wallet-figure">{points(wallet.balance)}</div>
        <span className="wallet-sub">
          {periodLabel(wallet.period)} allowance · {points(wallet.monthlyAllowance)} points
        </span>
      </div>
      <div className="wallet-daily">
        <div className="wallet-daily-head">
          <span>Spent today</span>
          <b>{rupees(wallet.spentToday)} <small>of {rupees(wallet.dailyLimit)}</small></b>
        </div>
        <div className="meter"><i style={{ width: `${usedPct}%` }} /></div>
        <span className="wallet-remaining">{rupees(wallet.dailyRemaining)} left to spend today</span>
      </div>
    </div>
  );
}

/*  Dashboard  */
function Dashboard({ menu, addToCart, setPage }) {
  const { user } = useAuth();
  const [active, setActive] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/orders/mine').then((d) => {
      if (!alive) return;
      const open = d.orders.find((o) => STATUS_FLOW.includes(o.status) && o.status !== 'collected');
      setActive(open || null);
    }).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const picks = (menu || []).filter((f) => f.available).slice(0, 4);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="muted">Here’s your wallet and what’s cooking today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPage('menu')}>
          Browse menu <ArrowRight size={16} />
        </button>
      </div>

      <WalletCard wallet={user.wallet} />

      {active && (
        <div className="active-order">
          <div className="active-order-head">
            <span className="order-no">#{active.orderNo}</span>
            <Badge tone={active.status === 'ready' ? 'ok' : 'warn'}>{STATUS_LABEL[active.status]}</Badge>
          </div>
          <b>{active.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</b>
          <MiniTimeline status={active.status} />
          <button className="linkish" onClick={() => setPage('orders')}>View order status</button>
        </div>
      )}

      <div className="section-head">
        <h3>Available now</h3>
        <button className="linkish" onClick={() => setPage('menu')}>See full menu</button>
      </div>
      {!menu ? <Spinner label="Loading menu" /> : (
        <div className="food-grid">
          {picks.map((f) => <FoodCard key={f._id} food={f} addToCart={addToCart} />)}
        </div>
      )}
    </div>
  );
}

function MiniTimeline({ status }) {
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div className="mini-timeline">
      {STATUS_FLOW.map((s, i) => (
        <span key={s} className={i <= idx ? 'on' : ''}>{STATUS_LABEL[s]}</span>
      ))}
    </div>
  );
}

/*  Menu -- */
function FoodCard({ food, addToCart }) {
  return (
    <div className={`food-card ${!food.available ? 'is-out' : ''}`}>
      <Monogram name={food.name} category={food.category} image={food.image} size="lg" />
      <div className="food-body">
        <div className="food-top">
          <VegMark veg={food.veg} />
          <span className="food-cat">{food.category}</span>
        </div>
        <h4>{food.name}</h4>
        <p>{food.description}</p>
        <div className="food-foot">
          <b>{rupees(food.price)}</b>
          {food.available ? (
            <button className="btn btn-soft" onClick={() => addToCart(food)}>
              <Plus size={15} /> Add
            </button>
          ) : (
            <span className="out-tag">Sold out</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Menu({ menu, addToCart }) {
  const [cat, setCat] = useState('All');
  const [veg, setVeg] = useState('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    if (!menu) return [];
    return menu.filter((f) =>
      (cat === 'All' || f.category === cat) &&
      (veg === 'all' || (veg === 'veg' ? f.veg : !f.veg)) &&
      f.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [menu, cat, veg, q]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Menu</h1>
          <p className="muted">Freshly prepared through the day.</p>
        </div>
        <div className="search">
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" />
        </div>
      </div>

      <div className="filters">
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className={cat === c ? 'chip active' : 'chip'} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="veg-toggle">
          {[['all', 'All'], ['veg', 'Veg'], ['non', 'Non-veg']].map(([v, l]) => (
            <button key={v} className={veg === v ? 'active' : ''} onClick={() => setVeg(v)}>{l}</button>
          ))}
        </div>
      </div>

      {!menu ? <Spinner label="Loading menu" /> :
        list.length === 0 ? <Empty title="Nothing matches" hint="Try a different category or search." /> : (
          <div className="food-grid">
            {list.map((f) => <FoodCard key={f._id} food={f} addToCart={addToCart} />)}
          </div>
        )}
    </div>
  );
}

/*  Cart -- */
function Cart({ cart, setCart, setPage }) {
  const { user, refresh, notify } = useAuth();
  const wallet = user.wallet;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const change = (id, d) =>
    setCart((c) => c.map((i) => (i._id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));

  const overBalance = wallet && total > wallet.balance;
  const overDaily = wallet && total > wallet.dailyRemaining;

  async function place() {
    setError('');
    setBusy(true);
    try {
      const items = cart.map((i) => ({ food: i._id, qty: i.qty }));
      const { order } = await api.post('/orders', { items, note });
      setCart([]);
      setNote('');
      await refresh();
      notify(`Order #${order.orderNo} placed`);
      setPage('orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!cart.length) {
    return (
      <div className="stack">
        <div className="page-head"><div><h1>Your cart</h1><p className="muted">Review before you order.</p></div></div>
        <Empty title="Your cart is empty" hint="Add something from the menu to get started."
          action={() => setPage('menu')} actionLabel="Browse menu" />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-head"><div><h1>Your cart</h1><p className="muted">Points are deducted when you place the order.</p></div></div>
      <div className="cart-layout">
        <div className="panel">
          {cart.map((i) => (
            <div className="cart-row" key={i._id}>
              <Monogram name={i.name} category={i.category} image={i.image} />
              <div className="grow">
                <b>{i.name}</b>
                <small>{rupees(i.price)} each</small>
              </div>
              <div className="qty">
                <button onClick={() => change(i._id, -1)} aria-label="Remove one"><Minus size={14} /></button>
                <b>{i.qty}</b>
                <button onClick={() => change(i._id, 1)} aria-label="Add one"><Plus size={14} /></button>
              </div>
              <b className="line-total">{rupees(i.price * i.qty)}</b>
            </div>
          ))}
          <div className="note">
            <span className="field-label">Note for the kitchen</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Less spicy, no onions, etc." />
          </div>
        </div>

        <div className="summary">
          <h3>Summary</h3>
          <div className="summary-row"><span>Items</span><b>{cart.reduce((s, i) => s + i.qty, 0)}</b></div>
          <div className="summary-row"><span>Order total</span><b>{rupees(total)}</b></div>
          <hr />
          {wallet && (
            <>
              <div className="summary-row muted-row"><span>Balance after order</span><b>{points(wallet.balance - total)}</b></div>
              <div className="summary-row muted-row"><span>Daily limit left</span><b>{rupees(wallet.dailyRemaining)}</b></div>
            </>
          )}
          {overBalance && <div className="form-error">Not enough points for this order.</div>}
          {!overBalance && overDaily && <div className="form-error">This exceeds your remaining daily limit of {rupees(wallet.dailyRemaining)}.</div>}
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy || overBalance || overDaily} onClick={place}>
            {busy ? 'Placing…' : 'Place order'} <ArrowRight size={16} />
          </button>
          <p className="fineprint">You’ll be notified when it’s ready to collect.</p>
        </div>
      </div>
    </div>
  );
}

/*  Order status -- */
const STEP_ICON = { placed: CircleDot, preparing: Clock3, ready: PackageCheck, collected: CheckCircle2 };

function OrderStatus({ setPage }) {
  const [order, setOrder] = useState(undefined);

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/orders/mine').then((d) => {
      if (!alive) return;
      const open = d.orders.find((o) => o.status !== 'collected' && o.status !== 'cancelled');
      setOrder(open || d.orders[0] || null);
    }).catch(() => setOrder(null));
    load();
    const t = setInterval(load, 6000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (order === undefined) return <Spinner label="Loading your order" />;
  if (!order) {
    return (
      <div className="stack">
        <div className="page-head"><div><h1>Order status</h1></div></div>
        <Empty title="No orders yet" hint="Place an order and track it here."
          action={() => setPage('menu')} actionLabel="Browse menu" />
      </div>
    );
  }

  const idx = STATUS_FLOW.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Order status <span className="order-no">#{order.orderNo}</span></h1>
          <p className="muted">{order.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</p>
        </div>
      </div>

      <div className="track-card">
        <div className="track-headline">
          <h2>{STATUS_LABEL[order.status]}</h2>
          <p>{cancelled ? 'This order was cancelled and points were refunded.' :
            order.status === 'ready' ? 'Head to the counter to collect it.' :
              'We’ll update this as your food moves through the kitchen.'}</p>
        </div>

        {!cancelled && (
          <ol className="timeline">
            {STATUS_FLOW.map((s, i) => {
              const Icon = STEP_ICON[s];
              const time = order.timeline?.[`${s}At`];
              const done = i <= idx;
              return (
                <li key={s} className={done ? 'done' : ''}>
                  <span className="dot"><Icon size={16} /></span>
                  <div><b>{STATUS_LABEL[s]}</b><small>{time ? clockTime(time) : (done ? '' : 'Pending')}</small></div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* - History - */
function History() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get('/orders/mine').then((d) => setOrders(d.orders)).catch(() => setOrders([])); }, []);

  if (!orders) return <Spinner label="Loading history" />;
  return (
    <div className="stack">
      <div className="page-head"><div><h1>History</h1><p className="muted">Your recent orders.</p></div></div>
      {orders.length === 0 ? <Empty title="No orders yet" hint="Your past orders will appear here." /> : (
        <div className="panel table">
          <div className="tr th"><span>Order</span><span>When</span><span>Items</span><span>Total</span><span>Status</span></div>
          {orders.map((o) => (
            <div className="tr" key={o._id}>
              <span className="mono">#{o.orderNo}</span>
              <span>{timeAgo(o.createdAt)}</span>
              <span className="clip">{o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</span>
              <span>{rupees(o.total)}</span>
              <span><Badge tone={o.status === 'collected' ? 'ok' : o.status === 'cancelled' ? 'muted' : 'warn'}>{STATUS_LABEL[o.status]}</Badge></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* - Account - */
function Account() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Account</h1><p className="muted">Your details and wallet.</p></div></div>
      <WalletCard wallet={user.wallet} />
      <div className="account-grid">
        <div className="panel">
          <h3>Profile</h3>
          <dl className="detail">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>ID</dt><dd className="mono">{user.loginId}</dd></div>
            <div><dt>Email</dt><dd>{user.email || '-'}</dd></div>
            <div><dt>Block</dt><dd>{user.block || '-'}</dd></div>
            <div><dt>Phone</dt><dd>{user.phone || '-'}</dd></div>
          </dl>
          <p className="fineprint">To change these details, contact the mess office.</p>
        </div>
        <ChangePassword />
      </div>
    </div>
  );
}
