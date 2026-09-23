import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api, setToken, getToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'ok') => {
    const id = Date.now();
    setToast({ message, tone, id });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2800);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { user: u } = await api.get('/auth/me');
      setUser(u);
      return u;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (loginId, password) => {
    const { token, user: u } = await api.post('/auth/login', { loginId, password });
    setToken(token);
    setUser(u);
    return u;
  }, []);

  // Self-service student registration (auto signs in on success).
  const register = useCallback(async (payload) => {
    const { token, user: u } = await api.post('/auth/register', payload);
    setToken(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout, refresh, notify }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.tone === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{toast.message}</span>
        </div>
      )}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
