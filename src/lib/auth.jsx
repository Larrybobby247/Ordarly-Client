import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, restaurant: null });
  const refresh = useCallback(async () => {
    try { const d = await api.get('/auth/me'); setState({ loading: false, ...d }); }
    catch { setState({ loading: false, user: null, restaurant: null }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const logout = async () => { await api.post('/auth/logout'); setState({ loading: false, user: null, restaurant: null }); };
  return <Ctx.Provider value={{ ...state, refresh, logout }}>{children}</Ctx.Provider>;
}
