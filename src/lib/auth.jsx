import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// PERF (new): customers on a restaurant page or an order-tracking page never need login info, so we skip the /auth/me request there
// (one less request before the menu can load). Everything else (dashboard, admin, login, marketing) still checks as before.
const PLATFORM_PATHS = ['', 'how-it-works', 'pricing', 'about', 'faq', 'contact', 'terms', 'privacy', 'login', 'register', 'verify-email', 'forgot-password', 'reset-password', 'dashboard', 'admin'];
const needsAuthCheck = (pathname) => PLATFORM_PATHS.includes(pathname.split('/')[1] || '');

export function AuthProvider({ children }) {
  const { pathname } = useLocation(); const checked = useRef(false);
  const [state, setState] = useState(() => ({ loading: needsAuthCheck(window.location.pathname), user: null, restaurant: null }));
  const refresh = useCallback(async () => {
    checked.current = true;
    try { const d = await api.get('/auth/me'); setState({ loading: false, ...d }); }
    catch { setState({ loading: false, user: null, restaurant: null }); }
  }, []);
  // Runs the first time we are on a page that needs to know who is signed in (also if a customer later navigates to the dashboard).
  useEffect(() => { if (!checked.current && needsAuthCheck(pathname)) { checked.current = true; setState((s) => ({ ...s, loading: true })); refresh(); } }, [pathname, refresh]);
  const logout = async () => { await api.post('/auth/logout'); setState({ loading: false, user: null, restaurant: null }); };
  return <Ctx.Provider value={{ ...state, refresh, logout }}>{children}</Ctx.Provider>;
}
