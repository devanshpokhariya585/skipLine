import React from 'react';
import {
  ChefHat, UtensilsCrossed, Zap, Wallet, PackageCheck, Bell, CircleSlash,
  Search, ShoppingBag, ArrowRight, LogIn,
} from 'lucide-react';
import { PRODUCT, TAGLINE, DESCRIPTION } from '../lib/brand';

const FEATURES = [
  [UtensilsCrossed, 'Digital Menu', 'Browse the full canteen menu with prices and availability, updated live.'],
  [Zap, 'Quick Ordering', 'Add items to your cart and place an order in seconds - no waiting to be served.'],
  [Wallet, 'Prepaid Points', 'A monthly points balance with a fair daily limit. Spend without cash or cards.'],
  [PackageCheck, 'Order Tracking', 'Follow each order from received to preparing to ready for pickup.'],
  [Bell, 'Real-time Updates', 'Know the moment the kitchen marks your food ready to collect.'],
  [CircleSlash, 'No Long Queues', 'Skip the line entirely. Order ahead and pick up when it suits you.'],
];

const STEPS = [
  [Search, 'Browse', 'Explore the menu and pick your meal.'],
  [ShoppingBag, 'Order', 'Pay with prepaid points in a tap.'],
  [ChefHat, 'Prepare', 'The kitchen cooks and updates status.'],
  [PackageCheck, 'Collect', 'Grab it when it’s marked ready.'],
];

export default function Landing({ onLogin, onRegister }) {
  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="brand-mark"><ChefHat size={20} strokeWidth={1.75} /></span>
          <b>{PRODUCT}</b>
        </div>
        <div className="lp-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={onLogin}>Login</button>
          <button className="btn btn-primary btn-sm" onClick={onRegister}>Create Account</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Smart Canteen Management</span>
          <h1>Order smarter.<br />Skip the line.</h1>
          <p className="lp-tag">{TAGLINE}</p>
          <p className="lp-desc">{DESCRIPTION}</p>
          <div className="lp-cta">
            <button className="btn btn-primary" onClick={onRegister}>Get Started <ArrowRight size={16} /></button>
            <button className="btn btn-ghost" onClick={onLogin}><LogIn size={16} /> Login</button>
            <a className="lp-explore" href="#features">Explore {PRODUCT}</a>
          </div>
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <h2>Why {PRODUCT}?</h2>
          <p className="muted">Everything students need to eat well between classes - minus the wait.</p>
        </div>
        <div className="lp-features">
          {FEATURES.map(([Icon, title, body]) => (
            <div className="lp-feature" key={title}>
              <span className="lp-feature-icon"><Icon size={20} strokeWidth={1.75} /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-how">
        <div className="lp-section-head">
          <h2>How {PRODUCT} works</h2>
          <p className="muted">Four simple steps from hungry to fed.</p>
        </div>
        <div className="lp-steps">
          {STEPS.map(([Icon, title, body], i) => (
            <React.Fragment key={title}>
              <div className="lp-step">
                <span className="lp-step-icon"><Icon size={20} strokeWidth={1.75} /></span>
                <div className="lp-step-no">Step {i + 1}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="lp-step-arrow" size={18} />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-band-inner">
          <h2>Ready to skip the line?</h2>
          <p>Create your account with the code from your mess office and start ordering today.</p>
          <button className="btn btn-onbrass" onClick={onRegister}>Create Account <ArrowRight size={16} /></button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="brand-mark sm"><ChefHat size={16} strokeWidth={1.75} /></span>
          <b>{PRODUCT}</b>
        </div>
        <span className="muted">Smart Canteen Management, Without the Queue.</span>
      </footer>
    </div>
  );
}
