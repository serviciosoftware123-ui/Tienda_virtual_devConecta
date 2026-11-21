import { storage } from './storage.js';

export const DEMO = import.meta.env.VITE_DEMO === 'true';
let token = storage.get('dc_token');

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export function setToken(t) {
  token = t;
  if (t) storage.set('dc_token', t); else storage.remove('dc_token');
}
export const getToken = () => token;

export async function api(path, { method = 'GET', body } = {}) {
  if (DEMO) {
    const { handle } = await import('./mock.js');
    try { return await handle(path, method, body, token); }
    catch (e) { throw new ApiError(e.message, e.status || 400); }
  }
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa que la API esté encendida.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Ocurrió un error. Intenta de nuevo.', res.status);
  return data;
}

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) p.set(k, Array.isArray(v) ? v.join(',') : v); });
  const s = p.toString();
  return s ? '?' + s : '';
};
