import React from 'react';
import {
  LayoutDashboard, UtensilsCrossed, ShoppingBag, Clock3, ReceiptText,
  UserRound, ChefHat, ToggleLeft, Users, BarChart3, LogOut, Wallet, Ticket,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { points, initials } from '../lib/format';

const NAV = {
  student: [
    ['dashboard', 'Overview', LayoutDashboard],
    ['menu', 'Menu', UtensilsCrossed],
    ['cart', 'Cart', ShoppingBag],
    ['orders', 'Order status', Clock3],
    ['history', 'History', ReceiptText],
    ['account', 'Account', UserRound],
  ],
  chef: [
    ['dashboard', 'Kitchen', LayoutDashboard],
    ['orders', 'Orders', Clock3],
    ['availability', 'Availability', ToggleLeft],
    ['account', 'Account', UserRound],
  ],
  admin: [
    ['dashboard', 'Overview', LayoutDashboard],
    ['menu', 'Menu', UtensilsCrossed],
    ['users', 'People', Users],
    ['codes', 'Codes', Ticket],
    ['orders', 'Orders', Clock3],
    ['reports', 'Reports', BarChart3],
    ['account', 'Account', UserRound],
  ],
};

const ROLE_LABEL = { student: 'Student', chef: 'Kitchen', admin: 'Owner' };

export default function Shell({ page, setPage, cartCount, mess, children }) {
  const { user, logout } = useAuth();
  const items = NAV[user.role] || [];
  const wallet = user.wallet;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><ChefHat size={20} strokeWidth={1.75} /></span>
          <span className="brand-text">
            <b>{mess || 'Smart Canteen'}</b>
            <small>{ROLE_LABEL[user.role]} workspace</small>
          </span>
        </div>

        <nav>
          {items.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setPage(id)}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
              {id === 'cart' && cartCount > 0 && <em className="nav-count">{cartCount}</em>}
            </button>
          ))}
        </nav>

        <button className="nav-item logout" onClick={logout}>
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="who">
            <span className="avatar">{initials(user.name)}</span>
            <span className="who-text">
              <b>{user.name}</b>
              <small>{user.loginId}{user.block ? ` · ${user.block}` : ''}</small>
            </span>
          </div>

          <div className="top-actions">
            {user.role === 'student' && wallet && (
              <button className="wallet-pill" onClick={() => setPage('account')}>
                <Wallet size={16} strokeWidth={1.75} />
                <span>{points(wallet.balance)}</span>
                <small>points</small>
              </button>
            )}
          </div>
        </header>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
