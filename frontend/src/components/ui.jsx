import React, { useEffect } from 'react';
import { X, Inbox, Loader2 } from 'lucide-react';
import { initials } from '../lib/format';


export function VegMark({ veg }) {
  return (
    <span className={`vegmark ${veg ? 'is-veg' : 'is-non'}`} title={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <i />
    </span>
  );
}


const TINTS = {
  'Main Course': 'tile-main',
  'South Indian': 'tile-south',
  Snacks: 'tile-snack',
  Beverages: 'tile-bev',
};
export function Monogram({ name, category, size = 'md', image }) {
  if (image) {
    return <span className={`monogram has-img ${size}`} style={{ backgroundImage: `url(${image})` }} />;
  }
  return <span className={`monogram ${TINTS[category] || ''} ${size}`}>{initials(name)}</span>;
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Spinner({ label }) {
  return (
    <div className="spinner">
      <Loader2 className="spin" size={20} />
      {label && <span>{label}</span>}
    </div>
  );
}

export function Empty({ title, hint, action, actionLabel }) {
  return (
    <div className="empty">
      <Inbox size={30} strokeWidth={1.5} />
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action && (
        <button className="btn btn-primary" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Modal({ title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, value, label, accent }) {
  return (
    <div className={`stat ${accent ? 'stat-accent' : ''}`}>
      <span className="stat-icon">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <b>{value}</b>
      <span className="stat-label">{label}</span>
    </div>
  );
}
