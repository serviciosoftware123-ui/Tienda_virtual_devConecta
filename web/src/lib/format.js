export function money(n, { decimals } = {}) {
  const d = decimals ?? (Number(n) % 1 ? 2 : 0);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
}
export function date(d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!d) return '';
  const s = String(d);
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
  return dt.toLocaleDateString('es-MX', opts);
}
export const shortDate = (d) => date(d, { day: 'numeric', month: 'short' });
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const METHOD_NAMES = { tarjeta: 'Tarjeta', mercadopago: 'Mercado Pago', paypal: 'PayPal', spei: 'Transferencia SPEI', oxxo: 'Efectivo en OXXO' };
export const STATUS = {
  anticipo_pendiente: { label: 'Anticipo pendiente', tone: 'warn' },
  anticipo_pagado: { label: 'En proceso', tone: 'accent' },
  saldo_pendiente: { label: 'Saldo pendiente', tone: 'warn' },
  pagado: { label: 'Pagado', tone: 'ok' },
  cancelado: { label: 'Cancelado', tone: 'danger' }
};
