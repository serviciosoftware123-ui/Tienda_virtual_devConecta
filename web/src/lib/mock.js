// Backend simulado para la demo en línea (sin servidor).
// Implementa las mismas rutas que la API real usando la misma lógica de negocio compartida.
import seed from '@shared/seed.json';
import {
  STAGES, POLICIES, CHAT_SUGGESTIONS, planPrice, lineSubtotal, deliveryQuote, couponDiscount, totals,
  simulatePayment, newFolio, chatbotReply, catalogQuery, suggest, reviewSummary, toCard, round2
} from '@shared/logic.mjs';
import { storage } from './storage.js';

const KEY = 'dc_demo_db_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

function fresh() {
  const categories = seed.categories.map((c, i) => ({ id: i + 1, slug: c.slug, name: c.name, description: c.description, icon: c.icon, sort: i, subcategories: c.subcategories.map((s, j) => ({ id: (i + 1) * 10 + j, slug: s.slug, name: s.name })) }));
  const packages = seed.packages.map((p, i) => ({ ...p, id: i + 1, created_at: p.created, active: true }));
  const reviews = seed.reviews.map((r, i) => ({ id: i + 1, package_id: packages.find((p) => p.slug === r.pkg).id, user_id: null, author: r.author, company: r.company, rating: r.rating, title: r.title, body: r.body, reply: null, verified: true, featured: r.featured, created_at: r.date }));
  return {
    seq: 1000, categories, packages, reviews,
    coupons: seed.coupons.map((c, i) => ({ ...c, id: i + 1, active: true })),
    faq: seed.faq.map((f, i) => ({ id: i + 1, category: f.category, question: f.q, answer: f.a })),
    users: [
      { id: 1, name: 'Administrador', email: 'admin@devconecta.mx', password: 'Admin123!', role: 'admin', prefs: { newsletter: false, promos: false, avance_email: true, avance_whatsapp: false } },
      { id: 2, name: 'Cliente Demo', email: 'cliente@demo.mx', password: 'Cliente123!', role: 'customer', phone: '9930000000', company: 'Comercializadora Demo', rfc: 'CDE260101AB1', prefs: { newsletter: true, promos: false, avance_email: true, avance_whatsapp: true } }
    ],
    addresses: [], orders: [], carts: {}, wishlist: [], subscribers: [], messages: []
  };
}

let db = storage.get(KEY) || fresh();
const save = () => storage.set(KEY, db);
const id = () => ++db.seq;
const err = (status, message) => { const e = new Error(message); e.status = status; throw e; };
const clone = (x) => JSON.parse(JSON.stringify(x));

function userFrom(token) {
  if (!token || !String(token).startsWith('demo.')) return null;
  return db.users.find((u) => u.id === Number(String(token).slice(5))) || null;
}
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || null, company: u.company || null, rfc: u.rfc || null, role: u.role, prefs: u.prefs });

function catalog(includeInactive = false) {
  const month = new Date().toISOString().slice(0, 7);
  const used = {};
  db.orders.filter((o) => o.status !== 'cancelado' && o.created_at.slice(0, 7) === month)
    .forEach((o) => o.items.forEach((i) => { used[i.slug] = (used[i.slug] || 0) + (i.unit ? 1 : i.qty); }));
  const pkgs = db.packages.filter((p) => includeInactive || p.active);
  const cards = pkgs.map((p) => {
    const cat = db.categories.find((c) => c.slug === p.category);
    const sub = cat.subcategories.find((s) => s.slug === p.sub);
    return toCard(p, cat, sub, db.reviews.filter((r) => r.package_id === p.id), used[p.slug]);
  });
  const categories = db.categories.map((c) => ({ ...c, count: cards.filter((x) => x.category === c.slug).length }));
  return { cards, categories, pkgs };
}

function resolveLines(items) {
  if (!Array.isArray(items) || !items.length) err(400, 'Tu carrito está vacío.');
  return items.map((i) => {
    const pkg = db.packages.find((p) => p.slug === i.slug && p.active);
    if (!pkg) err(400, 'Uno de los paquetes ya no está disponible. Actualiza tu carrito.');
    const qty = Math.max(1, Math.min(24, parseInt(i.qty, 10) || 1));
    const planId = pkg.plans.some((p) => p.id === i.plan) ? i.plan : pkg.plans[0].id;
    return { pkg, planId, qty, tech: pkg.techs.includes(i.tech) ? i.tech : pkg.techs[0] };
  });
}
function priceCart(items, code, deliveryId) {
  const lines = resolveLines(items);
  const subtotal = lineSubtotal(lines);
  let discount = 0;
  let coupon = null;
  if (code) {
    const r = couponDiscount(db.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase()), subtotal);
    if (!r.ok) err(400, r.error);
    discount = r.discount; coupon = r;
  }
  const options = deliveryQuote(lines, discount);
  const delivery = options.find((o) => o.id === deliveryId) || options[0];
  return { lines, options, delivery, coupon, totals: totals(subtotal, discount, delivery.cost) };
}
const orderView = (o) => ({ ...clone(o), stages: STAGES, anticipo: round2(o.total / 2), saldo: round2(o.total - o.paid) });

function payBalance(o, payment) {
  if (o.status === 'cancelado') err(400, 'Este pedido está cancelado.');
  if (o.stage < 5) err(400, 'El saldo se paga cuando el proyecto está listo para entrega.');
  const saldo = round2(o.total - o.paid);
  if (saldo <= 0) err(400, 'Este pedido ya está pagado.');
  const pay = simulatePayment(payment, saldo);
  if (pay.error) err(402, pay.error);
  o.payments.push({ ...pay, type: 'saldo' });
  if (pay.status === 'aprobado') { o.paid = round2(o.paid + saldo); o.status = 'pagado'; o.stage = 6; } else o.status = 'saldo_pendiente';
  save();
  return orderView(o);
}
function checkAddress(b) {
  if (!b.label || !b.street || !b.city || !b.state) err(400, 'Completa nombre, calle, ciudad y estado.');
  if (!/^\d{5}$/.test(String(b.zip || ''))) err(400, 'El código postal debe tener 5 dígitos.');
  if (b.rfc && !RFC_RE.test(b.rfc)) err(400, 'El RFC no tiene un formato válido.');
}
const strongPass = (p) => p && p.length >= 8 && /\d/.test(p) && /[a-zA-Z]/.test(p);

const routes = [];
const on = (method, pattern, fn, guard) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/?]+)') + '$'), fn, guard });

on('GET', '/categories', () => catalog().categories);
on('GET', '/home', () => {
  const { cards, categories } = catalog();
  const testimonials = db.reviews.filter((r) => r.featured).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
    .map((r) => { const p = db.packages.find((x) => x.id === r.package_id); return { author: r.author, company: r.company, rating: r.rating, title: r.title, body: r.body, package: p.name, slug: p.slug }; });
  return {
    featured: cards.filter((c) => c.featured).slice(0, 6), offers: cards.filter((c) => c.offer_pct > 0).sort((a, b) => b.offer_pct - a.offer_pct),
    categories, testimonials, stats: { projects: db.packages.reduce((s, p) => s + p.sold, 0), rating: reviewSummary(db.reviews).avg, reviews: db.reviews.length }
  };
});
on('GET', '/packages', (_p, _b, _u, query) => catalogQuery(catalog().cards, query));
on('GET', '/packages/suggest', (_p, _b, _u, query) => { const { cards, categories } = catalog(); return suggest(cards, categories, query.q || ''); });
on('GET', '/packages/:slug', ({ slug }) => {
  const { cards, categories } = catalog();
  const p = db.packages.find((x) => x.slug === slug && x.active);
  if (!p) err(404, 'No encontramos ese paquete.');
  const card = cards.find((c) => c.slug === slug);
  const cat = categories.find((c) => c.slug === card.category);
  const related = cards.filter((c) => c.slug !== slug && (c.category === card.category || c.techs.some((t) => card.techs.includes(t))))
    .sort((a, b) => (b.category === card.category) - (a.category === card.category) || b.sold - a.sold).slice(0, 4);
  return { ...card, description: p.description, plans: p.plans.map((pl) => ({ ...pl, ...planPrice(p, pl.id), plan: undefined })), specs: p.specs, category_obj: { slug: cat.slug, name: cat.name }, related };
});
on('GET', '/packages/:slug/reviews', ({ slug }, _b, _u, query) => {
  const p = db.packages.find((x) => x.slug === slug);
  if (!p) err(404, 'No encontramos ese paquete.');
  const items = db.reviews.filter((r) => r.package_id === p.id);
  const sorters = { mejores: (a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at), peores: (a, b) => a.rating - b.rating || b.created_at.localeCompare(a.created_at) };
  items.sort(sorters[query.orden] || ((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id));
  return { summary: reviewSummary(items), items: clone(items) };
});
on('POST', '/packages/:slug/reviews', ({ slug }, b, u) => {
  const p = db.packages.find((x) => x.slug === slug);
  if (!p) err(404, 'No encontramos ese paquete.');
  if (!(b.rating >= 1 && b.rating <= 5)) err(400, 'Elige de 1 a 5 estrellas.');
  if (!b.title || b.title.trim().length < 3) err(400, 'Escribe un título de al menos 3 letras.');
  if (!b.body || b.body.trim().length < 10) err(400, 'Cuéntanos un poco más (mínimo 10 caracteres).');
  const bought = db.orders.some((o) => o.user_id === u.id && o.status !== 'cancelado' && o.items.some((i) => i.slug === slug));
  const r = { id: id(), package_id: p.id, user_id: u.id, author: u.name, company: u.company || null, rating: b.rating, title: b.title.trim(), body: b.body.trim(), reply: null, verified: bought, featured: false, created_at: new Date().toISOString().slice(0, 10) };
  db.reviews.push(r); save(); return r;
}, 'auth');

on('POST', '/cart/quote', (_p, b) => { const r = priceCart(b.items, b.coupon, b.delivery); return { options: r.options, delivery: r.delivery.id, coupon: r.coupon, totals: r.totals }; });
on('POST', '/coupons/validate', (_p, b) => { const r = couponDiscount(db.coupons.find((c) => c.code.toUpperCase() === String(b.code || '').trim().toUpperCase()), Number(b.subtotal) || 0); if (!r.ok) err(400, r.error); return r; });
on('GET', '/cart', (_p, _b, u) => ({ items: db.carts[u.id] || [] }), 'auth');
on('PUT', '/cart', (_p, b, u) => { db.carts[u.id] = Array.isArray(b.items) ? b.items.slice(0, 30) : []; save(); return { items: db.carts[u.id] }; }, 'auth');

on('POST', '/orders', (_p, b, u) => {
  const c = b.contact || {};
  if (!b.accept) err(400, 'Acepta los términos y la política de cancelación para continuar.');
  if (!c.name || c.name.trim().length < 3) err(400, 'Escribe tu nombre completo.');
  if (!EMAIL_RE.test(c.email || '')) err(400, 'Escribe un correo válido para enviarte el folio.');
  if (!/^\d{10}$/.test(String(c.phone || '').replace(/\D/g, ''))) err(400, 'El teléfono debe tener 10 dígitos.');
  if (b.billing && b.billing.rfc && !RFC_RE.test(b.billing.rfc)) err(400, 'El RFC no tiene un formato válido.');
  const r = priceCart(b.items, b.coupon, b.delivery);
  const { cards } = catalog();
  r.lines.forEach((l) => { const card = cards.find((x) => x.slug === l.pkg.slug); if (card.available < (l.pkg.unit ? 1 : l.qty)) err(409, `Ya no hay cupo este mes para "${l.pkg.name}". Quedan ${card.available}.`); });
  const pay = simulatePayment(b.payment, r.totals.anticipo);
  if (pay.error) err(402, pay.error);
  const paid = pay.status === 'aprobado' ? pay.amount : 0;
  const o = {
    id: id(), folio: newFolio(), user_id: u ? u.id : null, email: c.email.trim().toLowerCase(), contact: { name: c.name.trim(), phone: c.phone, company: c.company || '' }, billing: b.billing || null,
    items: r.lines.map((l) => { const pp = planPrice(l.pkg, l.planId); return { slug: l.pkg.slug, name: l.pkg.name, kind: l.pkg.kind, unit: l.pkg.unit || null, plan: l.planId, plan_name: pp.plan.name, tech: l.tech, qty: l.qty, price: pp.price, weeks: pp.plan.weeks }; }),
    delivery: r.delivery, coupon: r.coupon ? r.coupon.code : null, ...r.totals, paid, stage: paid ? 1 : 0, status: paid ? 'anticipo_pagado' : 'anticipo_pendiente',
    payments: [{ ...pay, type: 'anticipo' }], notes: null, created_at: new Date().toISOString()
  };
  delete o.anticipo; delete o.saldo;
  db.orders.push(o);
  o.items.forEach((i) => { const p = db.packages.find((x) => x.slug === i.slug); p.sold++; });
  if (u) db.carts[u.id] = [];
  save(); return orderView(o);
});
on('GET', '/orders/track', (_p, _b, _u, query) => {
  const o = db.orders.find((x) => x.folio.toUpperCase() === String(query.folio || '').trim().toUpperCase() && x.email === String(query.email || '').trim().toLowerCase());
  if (!o) err(404, 'No encontramos un pedido con ese folio y correo. Revisa que estén escritos igual que en tu confirmación.');
  return orderView(o);
});

on('POST', '/auth/register', (_p, b) => {
  if (!b.name || b.name.trim().length < 3) err(400, 'Escribe tu nombre completo.');
  if (!EMAIL_RE.test(b.email || '')) err(400, 'Escribe un correo válido.');
  if (!strongPass(b.password)) err(400, 'La contraseña necesita al menos 8 caracteres, con letras y números.');
  const email = b.email.trim().toLowerCase();
  if (db.users.some((x) => x.email === email)) err(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
  const u = { id: id(), name: b.name.trim(), email, password: b.password, phone: b.phone || null, role: 'customer', prefs: { newsletter: !!b.newsletter, promos: !!b.newsletter, avance_email: true, avance_whatsapp: false } };
  db.users.push(u);
  if (b.newsletter && !db.subscribers.some((s) => s.email === email)) db.subscribers.push({ email, created_at: new Date().toISOString() });
  db.orders.filter((o) => !o.user_id && o.email === email).forEach((o) => { o.user_id = u.id; });
  save(); return { token: 'demo.' + u.id, user: pub(u) };
});
on('POST', '/auth/login', (_p, b) => {
  const u = db.users.find((x) => x.email === String(b.email || '').trim().toLowerCase());
  if (!u || u.password !== b.password) err(401, 'El correo o la contraseña no coinciden.');
  return { token: 'demo.' + u.id, user: pub(u) };
});
on('GET', '/auth/me', (_p, _b, u) => pub(u), 'auth');

on('PUT', '/me', (_p, b, u) => {
  if (!b.name || b.name.trim().length < 3) err(400, 'Escribe tu nombre completo.');
  if (b.phone && !/^\d{10}$/.test(String(b.phone).replace(/\D/g, ''))) err(400, 'El teléfono debe tener 10 dígitos.');
  if (b.rfc && !RFC_RE.test(b.rfc)) err(400, 'El RFC no tiene un formato válido.');
  Object.assign(u, { name: b.name.trim(), phone: b.phone || null, company: b.company || null, rfc: b.rfc ? b.rfc.toUpperCase() : null }); save(); return pub(u);
}, 'auth');
on('PUT', '/me/password', (_p, b, u) => {
  if (b.current !== u.password) err(400, 'La contraseña actual no es correcta.');
  if (!strongPass(b.next)) err(400, 'La nueva contraseña necesita al menos 8 caracteres, con letras y números.');
  u.password = b.next; save(); return { ok: true };
}, 'auth');
on('GET', '/me/preferences', (_p, _b, u) => u.prefs, 'auth');
on('PUT', '/me/preferences', (_p, b, u) => {
  u.prefs = { newsletter: !!b.newsletter, promos: !!b.promos, avance_email: !!b.avance_email, avance_whatsapp: !!b.avance_whatsapp };
  db.subscribers = db.subscribers.filter((s) => s.email !== u.email);
  if (u.prefs.newsletter) db.subscribers.push({ email: u.email, created_at: new Date().toISOString() });
  save(); return u.prefs;
}, 'auth');
on('GET', '/me/addresses', (_p, _b, u) => db.addresses.filter((a) => a.user_id === u.id).sort((a, b) => b.is_default - a.is_default || a.id - b.id), 'auth');
on('POST', '/me/addresses', (_p, b, u) => {
  checkAddress(b);
  const mine = db.addresses.filter((a) => a.user_id === u.id);
  const isDefault = !!b.is_default || !mine.length;
  if (isDefault) mine.forEach((a) => { a.is_default = false; });
  const a = { id: id(), user_id: u.id, label: b.label, razon: b.razon || null, rfc: b.rfc ? b.rfc.toUpperCase() : null, street: b.street, city: b.city, state: b.state, zip: b.zip, is_default: isDefault };
  db.addresses.push(a); save(); return a;
}, 'auth');
on('PUT', '/me/addresses/:aid', ({ aid }, b, u) => {
  checkAddress(b);
  const a = db.addresses.find((x) => x.id === Number(aid) && x.user_id === u.id);
  if (!a) err(404, 'No encontramos esa dirección.');
  if (b.is_default) db.addresses.filter((x) => x.user_id === u.id).forEach((x) => { x.is_default = false; });
  Object.assign(a, { label: b.label, razon: b.razon || null, rfc: b.rfc ? b.rfc.toUpperCase() : null, street: b.street, city: b.city, state: b.state, zip: b.zip, is_default: !!b.is_default });
  save(); return a;
}, 'auth');
on('DELETE', '/me/addresses/:aid', ({ aid }, _b, u) => { db.addresses = db.addresses.filter((x) => !(x.id === Number(aid) && x.user_id === u.id)); save(); return { ok: true }; }, 'auth');
on('GET', '/me/orders', (_p, _b, u) => db.orders.filter((o) => o.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(orderView), 'auth');
const myOrder = (folio, u) => { const o = db.orders.find((x) => x.folio === folio && x.user_id === u.id); if (!o) err(404, 'No encontramos ese pedido en tu cuenta.'); return o; };
on('GET', '/me/orders/:folio', ({ folio }, _b, u) => orderView(myOrder(folio, u)), 'auth');
on('POST', '/me/orders/:folio/pay', ({ folio }, b, u) => payBalance(myOrder(folio, u), b.payment), 'auth');
on('POST', '/me/orders/:folio/cancel', ({ folio }, b, u) => {
  const o = myOrder(folio, u);
  if (o.stage >= 3 || o.status === 'cancelado') err(400, 'Este pedido ya no se puede cancelar en línea. Escríbenos desde Contacto.');
  o.status = 'cancelado'; o.notes = String(b.reason || 'Cancelado por el cliente').slice(0, 300); save(); return orderView(o);
}, 'auth');
on('GET', '/me/wishlist', (_p, _b, u) => { const { cards } = catalog(); return db.wishlist.filter((w) => w.user_id === u.id).reverse().map((w) => cards.find((c) => c.id === w.package_id)).filter(Boolean); }, 'auth');
on('POST', '/me/wishlist', (_p, b, u) => {
  const p = db.packages.find((x) => x.slug === b.slug); if (!p) err(404, 'No encontramos ese paquete.');
  if (!db.wishlist.some((w) => w.user_id === u.id && w.package_id === p.id)) db.wishlist.push({ user_id: u.id, package_id: p.id });
  save(); return { ok: true };
}, 'auth');
on('DELETE', '/me/wishlist/:slug', ({ slug }, _b, u) => { const p = db.packages.find((x) => x.slug === slug); db.wishlist = db.wishlist.filter((w) => !(w.user_id === u.id && p && w.package_id === p.id)); save(); return { ok: true }; }, 'auth');

on('POST', '/newsletter', (_p, b) => {
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) err(400, 'Escribe un correo válido.');
  const already = db.subscribers.some((s) => s.email === email);
  if (!already) db.subscribers.push({ email, created_at: new Date().toISOString() });
  save(); return { ok: true, already };
});
on('POST', '/contact', (_p, b) => {
  if (!b.name || b.name.trim().length < 3) err(400, 'Escribe tu nombre.');
  if (!EMAIL_RE.test(b.email || '')) err(400, 'Escribe un correo válido para responderte.');
  if (!b.subject) err(400, 'Elige un motivo.');
  if (!b.message || b.message.trim().length < 15) err(400, 'Cuéntanos un poco más (mínimo 15 caracteres).');
  const m = { id: id(), name: b.name.trim(), email: b.email.trim(), subject: b.subject, message: b.message.trim(), folio: b.folio || null, answered: false, created_at: new Date().toISOString() };
  db.messages.push(m); save(); return { ok: true, ticket: 'T-' + String(m.id).padStart(5, '0') };
});
on('GET', '/faq', () => db.faq);
on('GET', '/policies', () => POLICIES);
on('POST', '/chat', (_p, b) => chatbotReply(b.message));
on('GET', '/chat/suggestions', () => CHAT_SUGGESTIONS);

// administrador
on('GET', '/admin/summary', () => {
  const live = db.orders.filter((o) => o.status !== 'cancelado');
  return { orders: db.orders.length, cobrado: round2(db.orders.reduce((s, o) => s + o.paid, 0)), por_cobrar: round2(live.reduce((s, o) => s + o.total - o.paid, 0)), en_curso: live.filter((o) => o.stage >= 1 && o.stage <= 5).length, pagos_pendientes: db.orders.filter((o) => o.status === 'anticipo_pendiente').length, mensajes: db.messages.filter((m) => !m.answered).length, suscriptores: db.subscribers.length };
}, 'admin');
on('GET', '/admin/orders', () => [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(orderView), 'admin');
on('PATCH', '/admin/orders/:folio', ({ folio }, b) => {
  const o = db.orders.find((x) => x.folio === folio); if (!o) err(404, 'No existe ese pedido.');
  if (b.confirm_payment) {
    o.payments = o.payments.map((p) => (p.status === 'pendiente' ? { ...p, status: 'aprobado', confirmed_at: new Date().toISOString() } : p));
    o.paid = round2(o.payments.filter((p) => p.status === 'aprobado').reduce((s, p) => s + p.amount, 0));
    o.status = o.paid >= o.total - 0.01 ? 'pagado' : o.paid > 0 ? 'anticipo_pagado' : o.status;
    o.stage = o.status === 'pagado' ? 6 : Math.max(o.stage, 1);
  } else if (b.cancel) { o.status = 'cancelado'; o.notes = 'Cancelado por administración'; }
  else {
    const stage = parseInt(b.stage, 10);
    if (!(stage >= 0 && stage <= 6)) err(400, 'Etapa no válida.');
    if (stage >= 1 && o.paid <= 0) err(400, 'Confirma primero el pago del anticipo.');
    if (stage === 6 && o.paid < o.total - 0.01) err(400, 'El cliente debe pagar el saldo antes de marcar como entregado.');
    o.stage = stage;
  }
  save(); return orderView(o);
}, 'admin');
on('GET', '/admin/packages', () => { const { cards, pkgs } = catalog(true); return pkgs.map((p) => ({ ...cards.find((c) => c.id === p.id), base_price: p.base_price, active: p.active })); }, 'admin');
on('PATCH', '/admin/packages/:pid', ({ pid }, b) => {
  const p = db.packages.find((x) => x.id === Number(pid)); if (!p) err(404, 'No existe ese paquete.');
  const base = b.base_price != null ? parseInt(b.base_price, 10) : p.base_price;
  const offer = b.offer_pct != null ? parseInt(b.offer_pct, 10) : p.offer_pct || 0;
  const slots = b.slots_total != null ? parseInt(b.slots_total, 10) : p.slots_total;
  if (!(base > 0) || !(offer >= 0 && offer <= 90) || !(slots >= 0)) err(400, 'Revisa precio (mayor a 0), oferta (0 a 90 %) y cupos.');
  Object.assign(p, { base_price: base, offer_pct: offer, slots_total: slots, active: b.active != null ? !!b.active : p.active, featured: b.featured != null ? !!b.featured : p.featured });
  save(); return { ok: true };
}, 'admin');
on('GET', '/admin/coupons', () => db.coupons, 'admin');
on('POST', '/admin/coupons', (_p, b) => {
  const code = String(b.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,20}$/.test(code)) err(400, 'El código debe tener de 4 a 20 letras o números, sin espacios.');
  if (!['pct', 'fixed'].includes(b.type) || !(b.value > 0) || (b.type === 'pct' && b.value > 90)) err(400, 'Revisa el tipo y el valor del descuento.');
  if (db.coupons.some((c) => c.code === code)) err(409, 'Ya existe un cupón con ese código.');
  const c = { id: id(), code, type: b.type, value: Number(b.value), min_subtotal: Number(b.min_subtotal) || 0, description: b.description || '', active: true };
  db.coupons.push(c); save(); return c;
}, 'admin');
on('PATCH', '/admin/coupons/:cid', ({ cid }, b) => { const c = db.coupons.find((x) => x.id === Number(cid)); c.active = !!b.active; save(); return c; }, 'admin');
on('GET', '/admin/reviews', () => db.reviews.map((r) => ({ ...r, package: db.packages.find((p) => p.id === r.package_id).name })).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id), 'admin');
on('PATCH', '/admin/reviews/:rid', ({ rid }, b) => { const r = db.reviews.find((x) => x.id === Number(rid)); r.reply = String(b.reply || '').trim() || null; save(); return r; }, 'admin');
on('DELETE', '/admin/reviews/:rid', ({ rid }) => { db.reviews = db.reviews.filter((x) => x.id !== Number(rid)); save(); return { ok: true }; }, 'admin');
on('GET', '/admin/messages', () => [...db.messages].reverse(), 'admin');
on('PATCH', '/admin/messages/:mid', ({ mid }, b) => { const m = db.messages.find((x) => x.id === Number(mid)); m.answered = !!b.answered; save(); return m; }, 'admin');
on('GET', '/admin/subscribers', () => [...db.subscribers].reverse(), 'admin');

export function resetDemo() { db = fresh(); save(); }

export async function handle(path, method, body, token) {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 120));
  const [pathname, search = ''] = path.split('?');
  const query = Object.fromEntries(new URLSearchParams(search));
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = pathname.match(r.re);
    if (!m) continue;
    const u = userFrom(token);
    if (r.guard === 'auth' && !u) err(401, 'Inicia sesión para continuar.');
    if (r.guard === 'admin' && (!u || u.role !== 'admin')) err(403, 'Solo el administrador puede hacer esto.');
    return clone(r.fn(m.groups || {}, body || {}, u, query));
  }
  err(404, 'Ruta no encontrada.');
}
