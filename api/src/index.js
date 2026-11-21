import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q, one, many, waitForDb } from './db.js';
import { seedIfEmpty } from './seed.js';
import {
  STAGES, POLICIES, CHAT_SUGGESTIONS, planPrice, lineSubtotal, deliveryQuote, couponDiscount, totals,
  simulatePayment, newFolio, chatbotReply, catalogQuery, suggest, reviewSummary, toCard, round2
} from '../../shared/logic.mjs';

const app = express();
app.use(express.json({ limit: '200kb' }));
const SECRET = process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- utilidades ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

function readUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), SECRET); } catch { return null; }
}
const optionalAuth = (req, _res, next) => { req.user = readUser(req); next(); };
const auth = (req, _res, next) => { req.user = readUser(req); if (!req.user) return next(new HttpError(401, 'Inicia sesión para continuar.')); next(); };
const admin = (req, _res, next) => { req.user = readUser(req); if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, 'Solo el administrador puede hacer esto.')); next(); };
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, company: u.company, rfc: u.rfc, role: u.role, prefs: u.prefs });
const sign = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });

// ---------- catálogo ----------
async function loadCatalog({ includeInactive = false } = {}) {
  const cats = await many('SELECT * FROM categories ORDER BY sort');
  const subs = await many('SELECT * FROM subcategories ORDER BY id');
  const pkgs = await many(`SELECT * FROM packages ${includeInactive ? '' : 'WHERE active'} ORDER BY id`);
  const reviews = await many('SELECT package_id, rating FROM reviews');
  const usedRows = await many(`
    SELECT item->>'slug' AS slug, SUM(CASE WHEN p.unit IS NULL THEN (item->>'qty')::int ELSE 1 END)::int AS used
    FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items) item
    JOIN packages p ON p.slug = item->>'slug'
    WHERE o.status <> 'cancelado' AND date_trunc('month', o.created_at) = date_trunc('month', now())
    GROUP BY 1`);
  const used = Object.fromEntries(usedRows.map((r) => [r.slug, r.used]));
  const categories = cats.map((c) => ({ ...c, subcategories: subs.filter((s) => s.category_id === c.id).map((s) => ({ id: s.id, slug: s.slug, name: s.name })) }));
  const cards = pkgs.map((p) => {
    const cat = cats.find((c) => c.id === p.category_id);
    const sub = subs.find((s) => s.id === p.subcategory_id);
    return toCard(p, cat, sub, reviews.filter((r) => r.package_id === p.id), used[p.slug]);
  });
  categories.forEach((c) => { c.count = cards.filter((x) => x.category === c.slug).length; });
  return { categories, cards, pkgs };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/categories', wrap(async (_req, res) => res.json((await loadCatalog()).categories)));

app.get('/api/home', wrap(async (_req, res) => {
  const { categories, cards } = await loadCatalog();
  const testimonials = await many(`SELECT r.author, r.company, r.rating, r.title, r.body, p.name AS package, p.slug
    FROM reviews r JOIN packages p ON p.id = r.package_id WHERE r.featured ORDER BY r.created_at DESC LIMIT 6`);
  const stats = await one('SELECT COALESCE(SUM(sold),0)::int AS projects FROM packages');
  const all = await many('SELECT rating FROM reviews');
  res.json({
    featured: cards.filter((c) => c.featured).slice(0, 6),
    offers: cards.filter((c) => c.offer_pct > 0).sort((a, b) => b.offer_pct - a.offer_pct),
    categories, testimonials,
    stats: { projects: stats.projects, rating: reviewSummary(all).avg, reviews: all.length }
  });
}));

app.get('/api/packages', wrap(async (req, res) => res.json(catalogQuery((await loadCatalog()).cards, req.query))));

app.get('/api/packages/suggest', wrap(async (req, res) => {
  const { cards, categories } = await loadCatalog();
  res.json(suggest(cards, categories, req.query.q || ''));
}));

app.get('/api/packages/:slug', wrap(async (req, res) => {
  const { cards, pkgs, categories } = await loadCatalog();
  const p = pkgs.find((x) => x.slug === req.params.slug);
  if (!p) fail(404, 'No encontramos ese paquete.');
  const card = cards.find((c) => c.slug === p.slug);
  const cat = categories.find((c) => c.slug === card.category);
  const plans = p.plans.map((pl) => ({ ...pl, ...planPrice(p, pl.id), plan: undefined }));
  const related = cards.filter((c) => c.slug !== p.slug && (c.category === card.category || c.techs.some((t) => card.techs.includes(t))))
    .sort((a, b) => (b.category === card.category) - (a.category === card.category) || b.sold - a.sold).slice(0, 4);
  res.json({ ...card, description: p.description, plans, specs: p.specs, category_obj: { slug: cat.slug, name: cat.name }, related });
}));

app.get('/api/packages/:slug/reviews', wrap(async (req, res) => {
  const p = await one('SELECT id FROM packages WHERE slug=$1', [req.params.slug]);
  if (!p) fail(404, 'No encontramos ese paquete.');
  const order = { recientes: 'created_at DESC', mejores: 'rating DESC, created_at DESC', peores: 'rating ASC, created_at DESC' }[req.query.orden] || 'created_at DESC';
  const items = await many(`SELECT id, author, company, rating, title, body, reply, verified, created_at FROM reviews WHERE package_id=$1 ORDER BY ${order}`, [p.id]);
  res.json({ summary: reviewSummary(items), items });
}));

app.post('/api/packages/:slug/reviews', auth, wrap(async (req, res) => {
  const p = await one('SELECT id FROM packages WHERE slug=$1', [req.params.slug]);
  if (!p) fail(404, 'No encontramos ese paquete.');
  const { rating, title, body } = req.body || {};
  if (!(rating >= 1 && rating <= 5)) fail(400, 'Elige de 1 a 5 estrellas.');
  if (!title || title.trim().length < 3) fail(400, 'Escribe un título de al menos 3 letras.');
  if (!body || body.trim().length < 10) fail(400, 'Cuéntanos un poco más (mínimo 10 caracteres).');
  const u = await one('SELECT name, company FROM users WHERE id=$1', [req.user.id]);
  const bought = await one(`SELECT 1 FROM orders o, jsonb_array_elements(o.items) i WHERE o.user_id=$1 AND i->>'slug'=$2 AND o.status<>'cancelado' LIMIT 1`, [req.user.id, req.params.slug]);
  const r = await one('INSERT INTO reviews (package_id,user_id,author,company,rating,title,body,verified) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [p.id, req.user.id, u.name, u.company, rating, title.trim(), body.trim(), !!bought]);
  res.status(201).json(r);
}));

// ---------- carrito, entrega y cupones ----------
async function resolveLines(items) {
  if (!Array.isArray(items) || !items.length) fail(400, 'Tu carrito está vacío.');
  const pkgs = await many('SELECT * FROM packages WHERE slug = ANY($1) AND active', [items.map((i) => i.slug)]);
  return items.map((i) => {
    const pkg = pkgs.find((p) => p.slug === i.slug);
    if (!pkg) fail(400, 'Uno de los paquetes ya no está disponible. Actualiza tu carrito.');
    const qty = Math.max(1, Math.min(24, parseInt(i.qty, 10) || 1));
    const planId = pkg.plans.some((p) => p.id === i.plan) ? i.plan : pkg.plans[0].id;
    const tech = pkg.techs.includes(i.tech) ? i.tech : pkg.techs[0];
    return { pkg, planId, qty, tech };
  });
}

async function priceCart(items, code, deliveryId) {
  const lines = await resolveLines(items);
  const subtotal = lineSubtotal(lines);
  let discount = 0;
  let coupon = null;
  if (code) {
    const c = await one('SELECT * FROM coupons WHERE upper(code)=upper($1)', [code.trim()]);
    const r = couponDiscount(c, subtotal);
    if (!r.ok) fail(400, r.error);
    discount = r.discount; coupon = r;
  }
  const options = deliveryQuote(lines, discount);
  const delivery = options.find((o) => o.id === deliveryId) || options[0];
  return { lines, subtotal, discount, coupon, options, delivery, totals: totals(subtotal, discount, delivery.cost) };
}

app.post('/api/cart/quote', wrap(async (req, res) => {
  const { items, coupon, delivery } = req.body || {};
  const r = await priceCart(items, coupon, delivery);
  res.json({ options: r.options, delivery: r.delivery.id, coupon: r.coupon, totals: r.totals });
}));

app.post('/api/coupons/validate', wrap(async (req, res) => {
  const { code, subtotal } = req.body || {};
  const c = await one('SELECT * FROM coupons WHERE upper(code)=upper($1)', [String(code || '').trim()]);
  const r = couponDiscount(c, Number(subtotal) || 0);
  if (!r.ok) fail(400, r.error);
  res.json(r);
}));

app.get('/api/cart', auth, wrap(async (req, res) => {
  const row = await one('SELECT items FROM carts WHERE user_id=$1', [req.user.id]);
  res.json({ items: row ? row.items : [] });
}));
app.put('/api/cart', auth, wrap(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 30) : [];
  await q(`INSERT INTO carts (user_id, items, updated_at) VALUES ($1,$2,now())
    ON CONFLICT (user_id) DO UPDATE SET items=EXCLUDED.items, updated_at=now()`, [req.user.id, JSON.stringify(items)]);
  res.json({ items });
}));

// ---------- pedidos ----------
const orderView = (o) => ({ ...o, stages: STAGES, anticipo: round2(o.total / 2), saldo: round2(o.total - o.paid) });

app.post('/api/orders', optionalAuth, wrap(async (req, res) => {
  const { items, coupon, delivery, contact = {}, billing, payment, accept } = req.body || {};
  if (!accept) fail(400, 'Acepta los términos y la política de cancelación para continuar.');
  if (!contact.name || contact.name.trim().length < 3) fail(400, 'Escribe tu nombre completo.');
  if (!EMAIL_RE.test(contact.email || '')) fail(400, 'Escribe un correo válido para enviarte el folio.');
  if (!/^\d{10}$/.test(String(contact.phone || '').replace(/\D/g, ''))) fail(400, 'El teléfono debe tener 10 dígitos.');
  if (billing && billing.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(billing.rfc)) fail(400, 'El RFC no tiene un formato válido.');
  const r = await priceCart(items, coupon, delivery);
  // Revisar cupos del mes
  const { cards } = await loadCatalog();
  for (const l of r.lines) {
    const card = cards.find((c) => c.slug === l.pkg.slug);
    const need = l.pkg.unit ? 1 : l.qty;
    if (card.available < need) fail(409, `Ya no hay cupo este mes para "${l.pkg.name}". Quedan ${card.available}.`);
  }
  const pay = simulatePayment(payment, r.totals.anticipo);
  if (pay.error) fail(402, pay.error);
  const orderItems = r.lines.map((l) => {
    const pp = planPrice(l.pkg, l.planId);
    return { slug: l.pkg.slug, name: l.pkg.name, kind: l.pkg.kind, unit: l.pkg.unit, plan: l.planId, plan_name: pp.plan.name, tech: l.tech, qty: l.qty, price: pp.price, weeks: pp.plan.weeks };
  });
  const paid = pay.status === 'aprobado' ? pay.amount : 0;
  const order = await one(`INSERT INTO orders (folio,user_id,email,contact,billing,items,delivery,coupon,subtotal,discount,delivery_cost,iva,total,paid,stage,status,payments)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [newFolio(), req.user ? req.user.id : null, contact.email.trim().toLowerCase(), JSON.stringify({ name: contact.name.trim(), phone: contact.phone, company: contact.company || '' }),
      billing ? JSON.stringify(billing) : null, JSON.stringify(orderItems), JSON.stringify(r.delivery), r.coupon ? r.coupon.code : null,
      r.totals.subtotal, r.totals.discount, r.totals.delivery_cost, r.totals.iva, r.totals.total, paid, paid ? 1 : 0,
      paid ? 'anticipo_pagado' : 'anticipo_pendiente', JSON.stringify([{ ...pay, type: 'anticipo' }])]);
  await q('UPDATE packages SET sold = sold + 1 WHERE slug = ANY($1)', [orderItems.map((i) => i.slug)]);
  if (req.user) await q('DELETE FROM carts WHERE user_id=$1', [req.user.id]);
  res.status(201).json(orderView(order));
}));

app.get('/api/orders/track', wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE upper(folio)=upper($1) AND lower(email)=lower($2)', [String(req.query.folio || '').trim(), String(req.query.email || '').trim()]);
  if (!o) fail(404, 'No encontramos un pedido con ese folio y correo. Revisa que estén escritos igual que en tu confirmación.');
  res.json(orderView(o));
}));

async function payBalance(o, payment) {
  if (o.status === 'cancelado') fail(400, 'Este pedido está cancelado.');
  if (o.stage < 5) fail(400, 'El saldo se paga cuando el proyecto está listo para entrega.');
  const saldo = round2(o.total - o.paid);
  if (saldo <= 0) fail(400, 'Este pedido ya está pagado.');
  const pay = simulatePayment(payment, saldo);
  if (pay.error) fail(402, pay.error);
  const approved = pay.status === 'aprobado';
  return one(`UPDATE orders SET payments = payments || $2::jsonb, paid = paid + $3, status = $4, stage = $5 WHERE id=$1 RETURNING *`,
    [o.id, JSON.stringify([{ ...pay, type: 'saldo' }]), approved ? saldo : 0, approved ? 'pagado' : 'saldo_pendiente', approved ? 6 : o.stage]);
}

// ---------- autenticación ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, phone, newsletter } = req.body || {};
  if (!name || name.trim().length < 3) fail(400, 'Escribe tu nombre completo.');
  if (!EMAIL_RE.test(email || '')) fail(400, 'Escribe un correo válido.');
  if (!password || password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) fail(400, 'La contraseña necesita al menos 8 caracteres, con letras y números.');
  if (await one('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email])) fail(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
  const hash = await bcrypt.hash(password, 10);
  const prefs = { newsletter: !!newsletter, promos: !!newsletter, avance_email: true, avance_whatsapp: false };
  const u = await one('INSERT INTO users (name,email,password_hash,phone,prefs) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name.trim(), email.trim().toLowerCase(), hash, phone || null, JSON.stringify(prefs)]);
  if (newsletter) await q('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING', [u.email]);
  // Si compró antes como invitado, ligamos esos pedidos a su cuenta.
  await q('UPDATE orders SET user_id=$1 WHERE user_id IS NULL AND lower(email)=lower($2)', [u.id, u.email]);
  res.status(201).json({ token: sign(u), user: publicUser(u) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const u = await one('SELECT * FROM users WHERE lower(email)=lower($1)', [String(email || '').trim()]);
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) fail(401, 'El correo o la contraseña no coinciden.');
  res.json({ token: sign(u), user: publicUser(u) });
}));

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (!u) fail(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  res.json(publicUser(u));
}));

// ---------- mi cuenta ----------
app.put('/api/me', auth, wrap(async (req, res) => {
  const { name, phone, company, rfc } = req.body || {};
  if (!name || name.trim().length < 3) fail(400, 'Escribe tu nombre completo.');
  if (phone && !/^\d{10}$/.test(String(phone).replace(/\D/g, ''))) fail(400, 'El teléfono debe tener 10 dígitos.');
  if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc)) fail(400, 'El RFC no tiene un formato válido.');
  const u = await one('UPDATE users SET name=$2, phone=$3, company=$4, rfc=$5 WHERE id=$1 RETURNING *', [req.user.id, name.trim(), phone || null, company || null, rfc ? rfc.toUpperCase() : null]);
  res.json(publicUser(u));
}));

app.put('/api/me/password', auth, wrap(async (req, res) => {
  const { current, next } = req.body || {};
  const u = await one('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (!(await bcrypt.compare(String(current || ''), u.password_hash))) fail(400, 'La contraseña actual no es correcta.');
  if (!next || next.length < 8 || !/\d/.test(next) || !/[a-zA-Z]/.test(next)) fail(400, 'La nueva contraseña necesita al menos 8 caracteres, con letras y números.');
  await q('UPDATE users SET password_hash=$2 WHERE id=$1', [u.id, await bcrypt.hash(next, 10)]);
  res.json({ ok: true });
}));

app.get('/api/me/preferences', auth, wrap(async (req, res) => res.json((await one('SELECT prefs FROM users WHERE id=$1', [req.user.id])).prefs)));
app.put('/api/me/preferences', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const prefs = { newsletter: !!b.newsletter, promos: !!b.promos, avance_email: !!b.avance_email, avance_whatsapp: !!b.avance_whatsapp };
  const u = await one('UPDATE users SET prefs=$2 WHERE id=$1 RETURNING email, prefs', [req.user.id, JSON.stringify(prefs)]);
  if (prefs.newsletter) await q('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING', [u.email]);
  else await q('DELETE FROM subscribers WHERE email=$1', [u.email]);
  res.json(u.prefs);
}));

app.get('/api/me/addresses', auth, wrap(async (req, res) => res.json(await many('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, id', [req.user.id]))));
function checkAddress(b) {
  if (!b.label || !b.street || !b.city || !b.state) fail(400, 'Completa nombre, calle, ciudad y estado.');
  if (!/^\d{5}$/.test(String(b.zip || ''))) fail(400, 'El código postal debe tener 5 dígitos.');
  if (b.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(b.rfc)) fail(400, 'El RFC no tiene un formato válido.');
}
app.post('/api/me/addresses', auth, wrap(async (req, res) => {
  const b = req.body || {}; checkAddress(b);
  const count = (await one('SELECT COUNT(*)::int n FROM addresses WHERE user_id=$1', [req.user.id])).n;
  const isDefault = !!b.is_default || count === 0;
  if (isDefault) await q('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  res.status(201).json(await one('INSERT INTO addresses (user_id,label,razon,rfc,street,city,state,zip,is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [req.user.id, b.label, b.razon || null, b.rfc ? b.rfc.toUpperCase() : null, b.street, b.city, b.state, b.zip, isDefault]));
}));
app.put('/api/me/addresses/:id', auth, wrap(async (req, res) => {
  const b = req.body || {}; checkAddress(b);
  if (b.is_default) await q('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  const a = await one('UPDATE addresses SET label=$3,razon=$4,rfc=$5,street=$6,city=$7,state=$8,zip=$9,is_default=$10 WHERE id=$1 AND user_id=$2 RETURNING *',
    [req.params.id, req.user.id, b.label, b.razon || null, b.rfc ? b.rfc.toUpperCase() : null, b.street, b.city, b.state, b.zip, !!b.is_default]);
  if (!a) fail(404, 'No encontramos esa dirección.');
  res.json(a);
}));
app.delete('/api/me/addresses/:id', auth, wrap(async (req, res) => {
  await q('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/me/orders', auth, wrap(async (req, res) => res.json((await many('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id])).map(orderView))));
app.get('/api/me/orders/:folio', auth, wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE folio=$1 AND user_id=$2', [req.params.folio, req.user.id]);
  if (!o) fail(404, 'No encontramos ese pedido en tu cuenta.');
  res.json(orderView(o));
}));
app.post('/api/me/orders/:folio/pay', auth, wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE folio=$1 AND user_id=$2', [req.params.folio, req.user.id]);
  if (!o) fail(404, 'No encontramos ese pedido en tu cuenta.');
  res.json(orderView(await payBalance(o, req.body.payment)));
}));
app.post('/api/me/orders/:folio/cancel', auth, wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE folio=$1 AND user_id=$2', [req.params.folio, req.user.id]);
  if (!o) fail(404, 'No encontramos ese pedido en tu cuenta.');
  if (o.stage >= 3 || o.status === 'cancelado') fail(400, 'Este pedido ya no se puede cancelar en línea. Escríbenos desde Contacto.');
  res.json(orderView(await one(`UPDATE orders SET status='cancelado', notes=$2 WHERE id=$1 RETURNING *`, [o.id, String(req.body.reason || 'Cancelado por el cliente').slice(0, 300)])));
}));

app.get('/api/me/wishlist', auth, wrap(async (req, res) => {
  const { cards, pkgs } = await loadCatalog();
  const rows = await many('SELECT package_id FROM wishlist WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json(rows.map((r) => cards.find((c) => c.id === r.package_id)).filter(Boolean));
  void pkgs;
}));
app.post('/api/me/wishlist', auth, wrap(async (req, res) => {
  const p = await one('SELECT id FROM packages WHERE slug=$1', [req.body.slug]);
  if (!p) fail(404, 'No encontramos ese paquete.');
  await q('INSERT INTO wishlist (user_id, package_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, p.id]);
  res.status(201).json({ ok: true });
}));
app.delete('/api/me/wishlist/:slug', auth, wrap(async (req, res) => {
  await q('DELETE FROM wishlist WHERE user_id=$1 AND package_id=(SELECT id FROM packages WHERE slug=$2)', [req.user.id, req.params.slug]);
  res.json({ ok: true });
}));

// ---------- atención al cliente ----------
app.post('/api/newsletter', wrap(async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Escribe un correo válido.');
  const r = await q('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING', [email]);
  res.status(201).json({ ok: true, already: r.rowCount === 0 });
}));

app.post('/api/contact', wrap(async (req, res) => {
  const { name, email, subject, message, folio } = req.body || {};
  if (!name || name.trim().length < 3) fail(400, 'Escribe tu nombre.');
  if (!EMAIL_RE.test(email || '')) fail(400, 'Escribe un correo válido para responderte.');
  if (!subject) fail(400, 'Elige un motivo.');
  if (!message || message.trim().length < 15) fail(400, 'Cuéntanos un poco más (mínimo 15 caracteres).');
  const m = await one('INSERT INTO messages (name,email,subject,message,folio) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at', [name.trim(), email.trim(), subject, message.trim(), folio || null]);
  res.status(201).json({ ok: true, ticket: 'T-' + String(m.id).padStart(5, '0') });
}));

app.get('/api/faq', wrap(async (_req, res) => res.json(await many('SELECT id, category, question, answer FROM faq ORDER BY sort'))));
app.get('/api/policies', (_req, res) => res.json(POLICIES));
app.post('/api/chat', (req, res) => res.json(chatbotReply((req.body || {}).message)));
app.get('/api/chat/suggestions', (_req, res) => res.json(CHAT_SUGGESTIONS));

// ---------- administrador ----------
app.get('/api/admin/summary', admin, wrap(async (_req, res) => {
  const s = await one(`SELECT COUNT(*)::int AS orders, COALESCE(SUM(paid),0) AS cobrado, COALESCE(SUM(total-paid) FILTER (WHERE status<>'cancelado'),0) AS por_cobrar,
    COUNT(*) FILTER (WHERE status NOT IN ('cancelado') AND stage BETWEEN 1 AND 5)::int AS en_curso FROM orders`);
  const pend = await one(`SELECT COUNT(*)::int n FROM orders WHERE status='anticipo_pendiente'`);
  const msgs = await one('SELECT COUNT(*)::int n FROM messages WHERE NOT answered');
  const subs = await one('SELECT COUNT(*)::int n FROM subscribers');
  res.json({ ...s, pagos_pendientes: pend.n, mensajes: msgs.n, suscriptores: subs.n });
}));
app.get('/api/admin/orders', admin, wrap(async (_req, res) => res.json((await many('SELECT * FROM orders ORDER BY created_at DESC')).map(orderView))));
app.patch('/api/admin/orders/:folio', admin, wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE folio=$1', [req.params.folio]);
  if (!o) fail(404, 'No existe ese pedido.');
  const b = req.body || {};
  if (b.confirm_payment) {
    const payments = o.payments.map((p) => (p.status === 'pendiente' ? { ...p, status: 'aprobado', confirmed_at: new Date().toISOString() } : p));
    const paid = round2(payments.filter((p) => p.status === 'aprobado').reduce((s, p) => s + p.amount, 0));
    const status = paid >= o.total - 0.01 ? 'pagado' : paid > 0 ? 'anticipo_pagado' : o.status;
    const stage = status === 'pagado' ? 6 : Math.max(o.stage, 1);
    return res.json(orderView(await one('UPDATE orders SET payments=$2, paid=$3, status=$4, stage=$5 WHERE id=$1 RETURNING *', [o.id, JSON.stringify(payments), paid, status, stage])));
  }
  if (b.cancel) return res.json(orderView(await one(`UPDATE orders SET status='cancelado', notes=$2 WHERE id=$1 RETURNING *`, [o.id, 'Cancelado por administración'])));
  const stage = parseInt(b.stage, 10);
  if (!(stage >= 0 && stage <= 6)) fail(400, 'Etapa no válida.');
  if (stage >= 1 && o.paid <= 0) fail(400, 'Confirma primero el pago del anticipo.');
  if (stage === 6 && o.paid < o.total - 0.01) fail(400, 'El cliente debe pagar el saldo antes de marcar como entregado.');
  res.json(orderView(await one('UPDATE orders SET stage=$2 WHERE id=$1 RETURNING *', [o.id, stage])));
}));
app.get('/api/admin/packages', admin, wrap(async (_req, res) => {
  const { cards, pkgs } = await loadCatalog({ includeInactive: true });
  res.json(pkgs.map((p) => ({ ...cards.find((c) => c.id === p.id), base_price: p.base_price, active: p.active })));
}));
app.patch('/api/admin/packages/:id', admin, wrap(async (req, res) => {
  const b = req.body || {};
  const p = await one('SELECT * FROM packages WHERE id=$1', [req.params.id]);
  if (!p) fail(404, 'No existe ese paquete.');
  const base = b.base_price != null ? parseInt(b.base_price, 10) : p.base_price;
  const offer = b.offer_pct != null ? parseInt(b.offer_pct, 10) : p.offer_pct;
  const slots = b.slots_total != null ? parseInt(b.slots_total, 10) : p.slots_total;
  if (!(base > 0) || !(offer >= 0 && offer <= 90) || !(slots >= 0)) fail(400, 'Revisa precio (mayor a 0), oferta (0 a 90 %) y cupos.');
  await q('UPDATE packages SET base_price=$2, offer_pct=$3, slots_total=$4, active=$5, featured=$6 WHERE id=$1',
    [p.id, base, offer, slots, b.active != null ? !!b.active : p.active, b.featured != null ? !!b.featured : p.featured]);
  res.json({ ok: true });
}));
app.get('/api/admin/coupons', admin, wrap(async (_req, res) => res.json(await many('SELECT * FROM coupons ORDER BY id'))));
app.post('/api/admin/coupons', admin, wrap(async (req, res) => {
  const b = req.body || {};
  const code = String(b.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,20}$/.test(code)) fail(400, 'El código debe tener de 4 a 20 letras o números, sin espacios.');
  if (!['pct', 'fixed'].includes(b.type) || !(b.value > 0) || (b.type === 'pct' && b.value > 90)) fail(400, 'Revisa el tipo y el valor del descuento.');
  if (await one('SELECT 1 FROM coupons WHERE code=$1', [code])) fail(409, 'Ya existe un cupón con ese código.');
  res.status(201).json(await one('INSERT INTO coupons (code,type,value,min_subtotal,description) VALUES ($1,$2,$3,$4,$5) RETURNING *', [code, b.type, b.value, b.min_subtotal || 0, b.description || '']));
}));
app.patch('/api/admin/coupons/:id', admin, wrap(async (req, res) => res.json(await one('UPDATE coupons SET active=$2 WHERE id=$1 RETURNING *', [req.params.id, !!req.body.active]))));
app.get('/api/admin/reviews', admin, wrap(async (_req, res) => res.json(await many('SELECT r.*, p.name AS package FROM reviews r JOIN packages p ON p.id=r.package_id ORDER BY r.created_at DESC, r.id DESC'))));
app.patch('/api/admin/reviews/:id', admin, wrap(async (req, res) => res.json(await one('UPDATE reviews SET reply=$2 WHERE id=$1 RETURNING *', [req.params.id, String(req.body.reply || '').trim() || null]))));
app.delete('/api/admin/reviews/:id', admin, wrap(async (req, res) => { await q('DELETE FROM reviews WHERE id=$1', [req.params.id]); res.json({ ok: true }); }));
app.get('/api/admin/messages', admin, wrap(async (_req, res) => res.json(await many('SELECT * FROM messages ORDER BY created_at DESC'))));
app.patch('/api/admin/messages/:id', admin, wrap(async (req, res) => res.json(await one('UPDATE messages SET answered=$2 WHERE id=$1 RETURNING *', [req.params.id, !!req.body.answered]))));
app.get('/api/admin/subscribers', admin, wrap(async (_req, res) => res.json(await many('SELECT * FROM subscribers ORDER BY created_at DESC'))));

// ---------- errores ----------
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada.')));
app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Ocurrió un error en el servidor. Intenta de nuevo.' });
});

const PORT = Number(process.env.PORT || 3000);
await waitForDb();
await seedIfEmpty();
app.listen(PORT, () => console.log(`API de DevConecta escuchando en el puerto ${PORT}`));
