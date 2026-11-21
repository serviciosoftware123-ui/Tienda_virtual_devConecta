// localStorage puede fallar (modo privado, vistas previas); usamos memoria como respaldo.
const mem = {};
export const storage = {
  get(key, fallback = null) {
    try { const v = window.localStorage.getItem(key); return v == null ? (key in mem ? mem[key] : fallback) : JSON.parse(v); }
    catch { return key in mem ? mem[key] : fallback; }
  },
  set(key, value) {
    mem[key] = value;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
  },
  remove(key) {
    delete mem[key];
    try { window.localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  }
};
