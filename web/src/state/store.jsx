import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setToken, getToken } from '../lib/api.js';
import { storage } from '../lib/storage.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const sameLine = (a, b) => a.slug === b.slug && a.plan === b.plan && a.tech === b.tech;

function mergeCarts(a, b) {
  const out = [...a];
  b.forEach((line) => {
    const i = out.findIndex((x) => sameLine(x, line));
    if (i >= 0) out[i] = { ...out[i], qty: Math.min(24, Math.max(out[i].qty, line.qty)) };
    else out.push(line);
  });
  return out;
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState(() => storage.get('dc_cart', []));
  const [cartOpen, setCartOpen] = useState(false);
  const [wish, setWish] = useState([]);
  const [toasts, setToasts] = useState([]);
  const syncTimer = useRef(null);

  const toast = useCallback((text, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, tone: opts.tone || 'ok', action: opts.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 3800);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const loadUserData = useCallback(async (u, localCart) => {
    setUser(u);
    const [serverCart, wl] = await Promise.all([api('/cart').catch(() => ({ items: [] })), api('/me/wishlist').catch(() => [])]);
    const merged = mergeCarts(serverCart.items || [], localCart || []);
    setCart(merged);
    setWish(wl.map((p) => p.slug));
    if ((localCart || []).length) api('/cart', { method: 'PUT', body: { items: merged } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api('/auth/me')
      .then((u) => loadUserData(u, storage.get('dc_cart', [])))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [loadUserData]);

  // Guardar carrito: en el navegador siempre; en el servidor si hay sesión.
  useEffect(() => {
    storage.set('dc_cart', cart);
    if (!user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => api('/cart', { method: 'PUT', body: { items: cart } }).catch(() => {}), 500);
  }, [cart, user]);

  const login = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.token);
    await loadUserData(r.user, cart);
    return r.user;
  };
  const register = async (data) => {
    const r = await api('/auth/register', { method: 'POST', body: data });
    setToken(r.token);
    await loadUserData(r.user, cart);
    return r.user;
  };
  const logout = () => {
    setToken(null); setUser(null); setWish([]); setCart([]);
    toast('Cerraste sesión.');
  };

  const addToCart = (line) => {
    setCart((c) => {
      const i = c.findIndex((x) => sameLine(x, line));
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: Math.min(24, n[i].qty + line.qty) }; return n; }
      return [...c, line];
    });
  };
  const updateLine = (idx, patch) => setCart((c) => c.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeLine = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  const toggleWish = async (slug, name) => {
    if (!user) { toast('Inicia sesión para guardar en tu lista de deseos.', { tone: 'info', action: { label: 'Iniciar sesión', to: '/entrar' } }); return; }
    const has = wish.includes(slug);
    setWish((w) => (has ? w.filter((s) => s !== slug) : [slug, ...w]));
    try {
      if (has) await api('/me/wishlist/' + slug, { method: 'DELETE' });
      else await api('/me/wishlist', { method: 'POST', body: { slug } });
      toast(has ? 'Quitado de tu lista de deseos.' : `${name || 'Paquete'} se guardó en tu lista de deseos.`);
    } catch (e) {
      setWish((w) => (has ? [slug, ...w] : w.filter((s) => s !== slug)));
      toast(e.message, { tone: 'danger' });
    }
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const value = useMemo(() => ({
    user, setUser, ready, login, register, logout,
    cart, cartCount, addToCart, updateLine, removeLine, clearCart, cartOpen, setCartOpen,
    wish, toggleWish, toast, toasts, dismiss
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, ready, cart, cartOpen, wish, toasts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
