import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { api } from './lib/api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import Shell from './components/Shell';
import Student from './pages/student';
import Chef from './pages/chef';
import Admin from './pages/admin';
import { Spinner } from './components/ui';

function Workspace({ mess }) {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [cart, setCart] = useState([]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <Shell page={page} setPage={setPage} cartCount={cartCount} mess={mess}>
      {user.role === 'student' && <Student page={page} setPage={setPage} cart={cart} setCart={setCart} />}
      {user.role === 'chef' && <Chef page={page} setPage={setPage} />}
      {user.role === 'admin' && <Admin page={page} setPage={setPage} />}
    </Shell>
  );
}

function Gate({ cfg }) {
  const { user, loading } = useAuth();
  // Which pre-login screen to show: landing | login | register
  const [view, setView] = useState('landing');
  const mess = cfg.messName || 'Smart Canteen';

  if (loading) {
    return <div className="splash"><Spinner label="Loading" /></div>;
  }

  if (user) {
    if (user.mustResetPassword) return <ChangePassword forced />;
    return <Workspace mess={mess} />;
  }

  if (view === 'login') {
    return <Login mess={mess} onRegister={() => setView('register')} onBack={() => setView('landing')} />;
  }
  if (view === 'register') {
    return <Register cfg={cfg} onLogin={() => setView('login')} onBack={() => setView('landing')} />;
  }
  return <Landing onLogin={() => setView('login')} onRegister={() => setView('register')} />;
}

export default function App() {
  const [cfg, setCfg] = useState({ messName: 'Smart Canteen' });
  useEffect(() => {
    api.get('/config').then((c) => setCfg((prev) => ({ ...prev, ...c }))).catch(() => {});
  }, []);
  return (
    <AuthProvider>
      <Gate cfg={cfg} />
    </AuthProvider>
  );
}
