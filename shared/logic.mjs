// Reglas de negocio compartidas por la API (Node) y por la demo del navegador.
// Así los precios, entregas, cupones y totales se calculan igual en ambos lados.

export const IVA = 0.16;
export const PRIORITY_PCT = 0.18; // costo extra de la entrega prioritaria
export const ANTICIPO_PCT = 0.5;

export const STAGES = [
  { id: 0, name: 'Pedido recibido', short: 'Recibido', detail: 'Esperamos la confirmación del anticipo.' },
  { id: 1, name: 'Análisis de requerimientos', short: 'Análisis', detail: 'Revisamos contigo objetivos, contenidos y alcance.' },
  { id: 2, name: 'Diseño', short: 'Diseño', detail: 'Preparamos las pantallas para tu aprobación.' },
  { id: 3, name: 'Desarrollo', short: 'Desarrollo', detail: 'Programamos y conectamos todo.' },
  { id: 4, name: 'Pruebas y ajustes', short: 'Pruebas', detail: 'Probamos en celular y computadora y aplicamos tus cambios.' },
  { id: 5, name: 'Listo para entrega', short: 'Entrega', detail: 'Revisa el resultado y paga el saldo para recibir código y accesos.' },
  { id: 6, name: 'Entregado', short: 'Entregado', detail: 'Proyecto entregado. Empieza tu periodo de soporte.' }
];

export const round2 = (n) => Math.round(n * 100) / 100;

export function planPrice(pkg, planId) {
  const plan = pkg.plans.find((p) => p.id === planId) || pkg.plans[0];
  const list = Math.round((pkg.base_price * plan.mult) / 100) * 100;
  const offer = pkg.offer_pct || 0;
  const price = offer ? Math.round((list * (1 - offer / 100)) / 10) * 10 : list;
  return { plan, list, price };
}

export function fromPrice(pkg) {
  return planPrice(pkg, pkg.plans[0].id);
}

export function addBusinessDays(start, days) {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

// lines: [{ pkg, planId, qty }]
export function lineSubtotal(lines) {
  return lines.reduce((s, l) => s + planPrice(l.pkg, l.planId).price * l.qty, 0);
}

export function deliveryQuote(lines, discount = 0, now = new Date()) {
  if (!lines.length) return [];
  const projectLines = lines.filter((l) => !l.pkg.unit);
  let weeks = 1;
  if (projectLines.length) {
    weeks = Math.max(...projectLines.map((l) => planPrice(l.pkg, l.planId).plan.weeks));
    // Varios proyectos en el mismo pedido se traslapan, pero suman algo de tiempo.
    weeks += Math.floor((projectLines.reduce((s, l) => s + l.qty, 0) - 1) / 2);
  }
  const base = Math.max(0, lineSubtotal(projectLines.length ? projectLines : lines) - discount);
  const prioWeeks = weeks <= 1 ? 1 : Math.min(weeks - 1, Math.max(1, Math.round(weeks * 0.7)));
  const opts = [
    { id: 'estandar', label: 'Estándar', description: 'Sigue el plazo del plan elegido.', weeks, cost: 0 },
    { id: 'prioritaria', label: 'Prioritaria', description: 'Equipo dedicado; reduce el plazo alrededor de 30 %.', weeks: prioWeeks, cost: Math.round(base * PRIORITY_PCT) }
  ];
  if (weeks <= 1) opts[1] = { ...opts[1], weeks: 1, description: 'Atención el mismo día hábil.' };
  return opts.map((o) => ({ ...o, eta: addBusinessDays(now, o.weeks * 5).toISOString().slice(0, 10) }));
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon || !coupon.active) return { ok: false, error: 'El código no existe o ya no está vigente.' };
  if (subtotal < (coupon.min_subtotal || 0))
    return { ok: false, error: `Este código aplica en compras desde ${money(coupon.min_subtotal)}.` };
  const discount = coupon.type === 'pct' ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
  return { ok: true, discount, code: coupon.code, description: coupon.description };
}

export function totals(subtotal, discount, deliveryCost) {
  const base = Math.max(0, subtotal - discount) + deliveryCost;
  const iva = round2(base * IVA);
  const total = round2(base + iva);
  const anticipo = round2(total * ANTICIPO_PCT);
  return { subtotal, discount, delivery_cost: deliveryCost, iva, total, anticipo, saldo: round2(total - anticipo) };
}

export function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

export function luhn(num) {
  const digits = String(num).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(num) {
  const n = String(num).replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return 'Tarjeta';
}

// Pago simulado. Nunca se guarda el número completo ni el CVV.
export function simulatePayment(payment, amount, now = new Date()) {
  const ref = 'PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const at = now.toISOString();
  const m = payment && payment.method;
  if (m === 'tarjeta') {
    const c = payment.card || {};
    const num = String(c.number || '').replace(/\D/g, '');
    if (!c.name || c.name.trim().length < 3) return { error: 'Escribe el nombre como aparece en la tarjeta.' };
    if (!luhn(num)) return { error: 'El número de tarjeta no es válido. Revisa los dígitos.' };
    const [mm, yy] = String(c.exp || '').split('/').map((x) => parseInt(x, 10));
    const expDate = new Date(2000 + (yy || 0), mm || 0, 0, 23, 59);
    if (!mm || mm > 12 || !yy || expDate < now) return { error: 'La tarjeta está vencida o la fecha no es válida (MM/AA).' };
    if (!/^\d{3,4}$/.test(String(c.cvv || ''))) return { error: 'El CVV debe tener 3 o 4 dígitos.' };
    if (num.endsWith('0002')) return { declined: true, error: 'El banco rechazó el pago por fondos insuficientes. Prueba con otra tarjeta u otro método.' };
    if (String(c.otp || '') !== '123456') return { error: 'El código de verificación 3-D Secure es incorrecto.' };
    return { status: 'aprobado', method: 'tarjeta', brand: cardBrand(num), last4: num.slice(-4), amount, ref, at };
  }
  if (m === 'mercadopago' || m === 'paypal') return { status: 'aprobado', method: m, amount, ref, at };
  if (m === 'spei') {
    const clabe = '6461801' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0');
    return { status: 'pendiente', method: 'spei', amount, ref, at, clabe, expires: addBusinessDays(now, 2).toISOString().slice(0, 10) };
  }
  if (m === 'oxxo') {
    const code = String(Math.floor(Math.random() * 1e14)).padStart(14, '9');
    return { status: 'pendiente', method: 'oxxo', amount, ref, at, oxxo_ref: code, expires: addBusinessDays(now, 3).toISOString().slice(0, 10) };
  }
  return { error: 'Elige un método de pago.' };
}

export function newFolio(now = new Date()) {
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `DC-${y}${m}${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const POLICIES = {
  devoluciones: {
    title: 'Política de cancelación y devoluciones',
    sections: [
      ['Derecho de revocación', 'Puedes cancelar tu pedido sin costo dentro de los 5 días hábiles siguientes al pago del anticipo, como lo establece el artículo 56 de la Ley Federal de Protección al Consumidor. Te devolvemos el 100 % de lo pagado en un máximo de 10 días hábiles, por el mismo medio de pago.'],
      ['Después de 5 días hábiles', 'Si el proyecto ya inició, devolvemos el anticipo menos el valor del trabajo entregado hasta ese momento (análisis, diseño o desarrollo), según el avance registrado en tu pedido.'],
      ['Servicios mensuales', 'Mantenimiento y hosting se pueden cancelar en cualquier momento con 15 días de aviso. No se devuelven meses ya iniciados.'],
      ['Cómo solicitarlo', 'Escríbenos desde el formulario de contacto con tu folio, o desde Mi cuenta > Pedidos > Solicitar cancelación.']
    ]
  },
  entregas: {
    title: 'Política de entregas',
    sections: [
      ['Plazos', 'El plazo de cada plan se cuenta en días hábiles a partir de la confirmación del anticipo. La fecha estimada aparece en el carrito y en tu pedido.'],
      ['Entrega prioritaria', 'Asigna un equipo dedicado y reduce el plazo alrededor de 30 %. Tiene un costo adicional del 18 % sobre el subtotal.'],
      ['Qué recibes', 'Al pagar el saldo te entregamos el código fuente, los accesos (dominio, hosting, panel) y el manual de uso.'],
      ['Retrasos', 'Si nos retrasamos más de 5 días hábiles por causas nuestras, te bonificamos 5 % del total por cada semana de retraso.']
    ]
  },
  privacidad: {
    title: 'Aviso de privacidad',
    sections: [
      ['Responsable', 'DevConecta (proyecto académico), con domicilio en Cunduacán, Tabasco, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (2025).'],
      ['Datos que recabamos', 'Nombre, correo, teléfono, empresa y datos fiscales. No guardamos números de tarjeta ni CVV: el pago se procesa en la pasarela.'],
      ['Finalidades', 'Prestar el servicio contratado, facturar, informarte del avance y, solo si lo autorizas, enviarte promociones.'],
      ['Tus derechos', 'Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos (derechos ARCO) escribiendo a privacidad@devconecta.mx o desde Mi cuenta.']
    ]
  },
  terminos: {
    title: 'Términos y condiciones',
    sections: [
      ['Pagos por hitos', 'Al confirmar el pedido pagas un anticipo del 50 %. El 50 % restante se paga al aprobar la entrega final.'],
      ['Precios', 'Los precios están en pesos mexicanos. En el resumen del pedido se desglosa el IVA del 16 %.'],
      ['Propiedad', 'Al liquidar el pedido, el código fuente y los entregables pasan a ser propiedad del cliente.'],
      ['Aviso', 'Este sitio es un prototipo académico de la materia de Comercio Electrónico (UJAT). Los pagos son simulados y no se realizan cargos reales.']
    ]
  }
};

// Chatbot de respuestas fijas por palabras clave.
const RULES = [
  { k: ['pago', 'pagar', 'tarjeta', 'oxxo', 'spei', 'paypal', 'mercado'], r: 'Aceptamos tarjeta, Mercado Pago, PayPal, SPEI y OXXO. Al hacer el pedido pagas el 50 % de anticipo y el resto al aprobar la entrega.', links: [['Ver métodos de pago', '/ayuda']] },
  { k: ['anticipo', '50', 'mitad', 'saldo'], r: 'Trabajamos por hitos: 50 % para iniciar y 50 % cuando apruebas la entrega final. El saldo se paga desde Mi cuenta > Pedidos.', links: [['Ir a mis pedidos', '/cuenta/pedidos']] },
  { k: ['factura', 'cfdi', 'rfc', 'fiscal'], r: 'Emitimos CFDI 4.0 por cada pago. Captura tus datos fiscales en el checkout o en Mi cuenta.', links: [] },
  { k: ['tiempo', 'tarda', 'entrega', 'plazo', 'cuando', 'cuándo', 'semanas'], r: 'El plazo depende del plan: una landing tarda 1 a 3 semanas y un sistema de 6 a 12. En el carrito verás la fecha estimada y puedes elegir entrega prioritaria.', links: [['Política de entregas', '/politicas/entregas']] },
  { k: ['rastrear', 'avance', 'seguimiento', 'folio', 'estado', 'pedido'], r: 'Puedes ver el avance de tu proyecto en Mi cuenta > Pedidos. Si compraste como invitado, usa tu folio y correo en Rastrear pedido.', links: [['Rastrear pedido', '/rastrear']] },
  { k: ['cancelar', 'devolución', 'devolucion', 'reembolso', 'regresar'], r: 'Puedes cancelar sin costo dentro de los 5 días hábiles siguientes al pago. Después, devolvemos el anticipo menos el trabajo entregado.', links: [['Política de devoluciones', '/politicas/devoluciones']] },
  { k: ['precio', 'cuesta', 'costo', 'barato', 'cotiza', 'cotización'], r: 'Los precios van desde $950 al mes (hosting) y $6,500 (landing page). Cada paquete tiene planes Básico, Pro y Empresarial.', links: [['Ver catálogo', '/catalogo']] },
  { k: ['tienda', 'vender', 'ecommerce', 'en línea', 'online'], r: 'Para vender en línea te recomendamos la Tienda en línea completa o, si cobras por WhatsApp, el Catálogo digital.', links: [['Tiendas en línea', '/catalogo?categoria=tiendas-en-linea']] },
  { k: ['app', 'android', 'iphone', 'ios', 'móvil', 'movil'], r: 'Hacemos apps Android nativas en Kotlin y apps para Android y iPhone con Flutter.', links: [['Apps móviles', '/catalogo?categoria=apps-moviles']] },
  { k: ['cita', 'consultorio', 'dentista', 'clínica', 'clinica', 'agenda'], r: 'El Sistema de citas y expedientes incluye reservas en línea y recordatorios por WhatsApp.', links: [['Ver sistema de citas', '/producto/agenda-de-citas']] },
  { k: ['cupón', 'cupon', 'descuento', 'promoción', 'promocion', 'oferta'], r: 'Usa BIENVENIDA10 para 10 % en tu primer proyecto. También revisa las ofertas de la página de inicio.', links: [['Ver ofertas', '/catalogo?orden=oferta']] },
  { k: ['código', 'codigo', 'propiedad', 'fuente'], r: 'Al pagar el saldo te entregamos el código fuente y los accesos. El código es 100 % tuyo.', links: [] },
  { k: ['privacidad', 'datos', 'arco'], r: 'Solo usamos tus datos para el servicio y la facturación. Puedes ejercer tus derechos ARCO cuando quieras.', links: [['Aviso de privacidad', '/politicas/privacidad']] },
  { k: ['humano', 'asesor', 'persona', 'hablar', 'contacto', 'llamar', 'whatsapp'], r: 'Con gusto te atiende un asesor. Déjanos tu mensaje en el formulario y te contestamos en menos de 24 horas hábiles, o escríbenos al WhatsApp 993 000 0000.', links: [['Formulario de contacto', '/contacto']] },
  { k: ['hola', 'buenas', 'buenos'], r: '¡Hola! Soy el asistente de DevConecta. Pregúntame por precios, tiempos de entrega, pagos o el avance de tu pedido.', links: [] },
  { k: ['gracias'], r: '¡Con gusto! Si necesitas algo más, aquí estoy.', links: [] }
];

export const CHAT_SUGGESTIONS = ['¿Cuánto cuesta una tienda en línea?', '¿Cómo pago?', '¿Cuánto tarda?', 'Rastrear mi pedido', 'Hablar con un asesor'];

export function chatbotReply(message) {
  const text = String(message || '').toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const rule of RULES) {
    const score = rule.k.filter((k) => text.includes(k)).length;
    if (score > bestScore) { best = rule; bestScore = score; }
  }
  if (!best) {
    return { reply: 'No estoy seguro de haber entendido. Puedo ayudarte con precios, pagos, tiempos de entrega, cancelaciones o el avance de tu pedido. También puedes hablar con un asesor.', links: [['Centro de ayuda', '/ayuda'], ['Hablar con un asesor', '/contacto']], suggestions: CHAT_SUGGESTIONS };
  }
  return { reply: best.r, links: best.links, suggestions: [] };
}

// ---------- Catálogo: búsqueda, filtros, orden (misma lógica en API y demo) ----------
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function textScore(card, q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const hay = {
    name: norm(card.name),
    rest: norm([card.short, card.category_name, card.sub_name, card.techs.join(' '), card.features.join(' ')].join(' '))
  };
  let score = 0;
  for (const w of words) {
    if (hay.name.includes(w)) score += 3;
    else if (hay.rest.includes(w)) score += 1;
    else return 0;
  }
  return score;
}

export function catalogQuery(cards, params = {}) {
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => x.trim()).filter(Boolean);
  const techs = list(params.tech);
  const feats = list(params.feat);
  const min = params.min ? Number(params.min) : null;
  const max = params.max ? Number(params.max) : null;
  const minRating = params.rating ? Number(params.rating) : null;
  const q = params.q || '';

  let base = cards.filter((c) => (!params.categoria || c.category === params.categoria) && (!params.sub || c.sub === params.sub));
  base = base.map((c) => ({ c, s: textScore(c, q) })).filter((x) => x.s > 0);

  const facetSource = base.map((x) => x.c);
  const count = (key) => {
    const m = new Map();
    facetSource.forEach((c) => c[key].forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
    return [...m.entries()].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };
  const prices = facetSource.map((c) => c.price);
  const facets = { techs: count('techs'), features: count('features'), price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 } };

  let items = base.filter(({ c }) =>
    (!techs.length || techs.some((t) => c.techs.includes(t))) &&
    (!feats.length || feats.every((f) => c.features.includes(f))) &&
    (min == null || c.price >= min) && (max == null || c.price <= max) &&
    (minRating == null || c.rating >= minRating) &&
    (params.orden !== 'oferta' || c.offer_pct > 0));

  const sorters = {
    relevancia: (a, b) => b.s - a.s || b.c.sold - a.c.sold,
    popular: (a, b) => b.c.sold - a.c.sold,
    'precio-asc': (a, b) => a.c.price - b.c.price,
    'precio-desc': (a, b) => b.c.price - a.c.price,
    nuevo: (a, b) => String(b.c.created_at).localeCompare(String(a.c.created_at)),
    calificacion: (a, b) => b.c.rating - a.c.rating || b.c.reviews_count - a.c.reviews_count,
    oferta: (a, b) => b.c.offer_pct - a.c.offer_pct
  };
  const orden = params.orden || (q ? 'relevancia' : 'popular');
  items.sort(sorters[orden] || sorters.popular);
  const limit = Math.min(48, Number(params.limit) || 12);
  const page = Math.max(1, Number(params.page) || 1);
  const total = items.length;
  return { items: items.slice((page - 1) * limit, page * limit).map((x) => x.c), total, page, pages: Math.max(1, Math.ceil(total / limit)), facets, orden };
}

export function suggest(cards, categories, q) {
  if (!norm(q).trim()) return { packages: [], categories: [], techs: [] };
  const pk = cards.map((c) => ({ c, s: textScore(c, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || b.c.sold - a.c.sold).slice(0, 5)
    .map(({ c }) => ({ slug: c.slug, name: c.name, category_name: c.category_name, price: c.price, kind: c.kind, unit: c.unit }));
  const nq = norm(q);
  const cats = categories.filter((c) => norm(c.name).includes(nq) || c.subcategories.some((s) => norm(s.name).includes(nq))).slice(0, 3).map((c) => ({ slug: c.slug, name: c.name }));
  const techs = [...new Set(cards.flatMap((c) => c.techs))].filter((t) => norm(t).includes(nq)).slice(0, 3);
  return { packages: pk, categories: cats, techs };
}

export function reviewSummary(reviews) {
  const dist = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: reviews.filter((x) => x.rating === r).length }));
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { avg, count, dist };
}

// Convierte un paquete (fila de BD o semilla) en la tarjeta que usa el catálogo.
export function toCard(p, cat, sub, reviews, used) {
  const { price, list } = fromPrice(p);
  const sum = reviewSummary(reviews);
  return {
    id: p.id, slug: p.slug, name: p.name, kind: p.kind, short: p.short,
    category: cat.slug, category_name: cat.name, sub: sub ? sub.slug : null, sub_name: sub ? sub.name : null,
    techs: p.techs, features: p.features, price, list, offer_pct: p.offer_pct || 0, unit: p.unit || null,
    rating: sum.avg, reviews_count: sum.count, sold: p.sold, created_at: String(p.created_at || p.created).slice(0, 10),
    featured: !!p.featured, slots_total: p.slots_total, available: Math.max(0, p.slots_total - (used || 0))
  };
}
