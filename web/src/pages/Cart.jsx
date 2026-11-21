import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { money, date } from '../lib/format.js';
import { storage } from '../lib/storage.js';
import { useStore } from '../state/store.jsx';
import { Icon, Qty, Empty, Alert, Crumbs } from '../components/ui.jsx';
import Mockup from '../components/Mockup.jsx';

// Cotiza el carrito en el servidor: entrega, cupón, IVA y anticipo.
export function useQuote(cart) {
  const saved = storage.get('dc_checkout', { coupon: '', delivery: 'estandar' });
  const [coupon, setCoupon] = useState(saved.coupon || '');
  const [delivery, setDelivery] = useState(saved.delivery || 'estandar');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const keepError = useRef(false);
  const key = JSON.stringify(cart.map((l) => [l.slug, l.plan, l.tech, l.qty]));
  useEffect(() => {
    storage.set('dc_checkout', { coupon, delivery });
    if (!cart.length) { setQuote(null); return; }
    setLoading(true);
    api('/cart/quote', { method: 'POST', body: { items: cart, coupon, delivery } })
      .then((q) => { setQuote(q); if (keepError.current) keepError.current = false; else setError(''); })
      .catch((e) => {
        setError(e.message);
        if (coupon) { keepError.current = true; setCoupon(''); }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, coupon, delivery]);
  return { quote, coupon, setCoupon, delivery, setDelivery, error, setError, loading };
}

export function DeliveryOptions({ quote, delivery, setDelivery }) {
  if (!quote) return null;
  return (
    <fieldset className="delivery">
      <legend>Tiempo de entrega</legend>
      {quote.options.map((o) => (
        <label key={o.id} className={'delivery-opt' + (o.id === quote.delivery ? ' is-on' : '')}>
          <input type="radio" name="delivery" checked={o.id === quote.delivery} onChange={() => setDelivery(o.id)} />
          <span><b>{o.label}</b><small>{o.description}</small><small><Icon name="clock" size={13} /> Llega el {date(o.eta, { weekday: 'short', day: 'numeric', month: 'short' })} · {o.weeks} {o.weeks === 1 ? 'semana' : 'semanas'}</small></span>
          <span className="mono">{o.cost ? '+' + money(o.cost) : 'Sin costo'}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function CouponBox({ coupon, setCoupon, quote }) {
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  if (coupon && quote && quote.coupon) {
    return (
      <div className="coupon-on">
        <Icon name="check" size={16} /><span><b className="mono">{quote.coupon.code}</b> · {quote.coupon.description}</span>
        <button className="link" onClick={() => setCoupon('')}>Quitar</button>
      </div>
    );
  }
  return open ? (
    <form className="coupon" onSubmit={(e) => { e.preventDefault(); if (code.trim()) setCoupon(code.trim().toUpperCase()); }}>
      <label htmlFor="cpn" className="sr-only">Código de descuento</label>
      <input id="cpn" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de descuento" autoFocus />
      <button className="btn btn-ghost btn-sm">Aplicar</button>
    </form>
  ) : <button className="link" onClick={() => setOpen(true)}>¿Tienes un código de descuento?</button>;
}

export function Summary({ quote, children, loading }) {
  if (!quote) return null;
  const t = quote.totals;
  return (
    <div className={'summary' + (loading ? ' is-loading' : '')}>
      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
        {t.discount > 0 && <div className="is-discount"><dt>Descuento</dt><dd>−{money(t.discount)}</dd></div>}
        <div><dt>Entrega</dt><dd>{t.delivery_cost ? money(t.delivery_cost) : 'Sin costo'}</dd></div>
        <div><dt>IVA 16 %</dt><dd>{money(t.iva, { decimals: 2 })}</dd></div>
        <div className="is-total"><dt>Total del proyecto</dt><dd>{money(t.total, { decimals: 2 })}</dd></div>
      </dl>
      <div className="today">
        <div><span>Hoy pagas · anticipo 50 %</span><b className="mono">{money(t.anticipo, { decimals: 2 })}</b></div>
        <small>El saldo de {money(t.saldo, { decimals: 2 })} se paga al aprobar la entrega.</small>
      </div>
      {children}
    </div>
  );
}

export default function Cart() {
  const { cart, updateLine, removeLine, user, toggleWish } = useStore();
  const nav = useNavigate();
  const [info, setInfo] = useState({});
  const q = useQuote(cart);

  useEffect(() => {
    [...new Set(cart.map((l) => l.slug))].filter((s) => !info[s]).forEach((s) => api('/packages/' + s).then((d) => setInfo((i) => ({ ...i, [s]: d }))).catch(() => {}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);
  // Mantener precios del carrito al día con el catálogo
  useEffect(() => {
    cart.forEach((l, i) => { const d = info[l.slug]; if (!d) return; const pl = d.plans.find((x) => x.id === l.plan); if (pl && pl.price !== l.price) updateLine(i, { price: pl.price }); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  if (!cart.length) {
    return <div className="wrap page"><Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Carrito' }]} /><Empty icon="cart" title="Tu carrito está vacío" action={<Link to="/catalogo" className="btn btn-primary">Explorar paquetes</Link>}>Elige un paquete y un plan; aquí verás el precio total, la fecha de entrega y cuánto pagas hoy.</Empty></div>;
  }

  const changePlan = (i, l, planId) => { const pl = info[l.slug].plans.find((x) => x.id === planId); updateLine(i, { plan: planId, plan_name: pl.name, price: pl.price }); };
  const saveForLater = (i, l) => { if (!user) { toggleWish(l.slug, l.name); return; } toggleWish(l.slug, l.name); removeLine(i); };

  return (
    <div className="wrap page">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Carrito' }]} />
      <h1>Carrito</h1>
      {!user && <Alert><Link to="/entrar">Inicia sesión</Link> o <Link to="/registro">crea una cuenta</Link> para guardar tu carrito y seguir el avance de tus proyectos. También puedes pagar como invitado.</Alert>}
      <div className="cart-grid">
        <ul className="cart-lines">
          {cart.map((l, i) => {
            const d = info[l.slug];
            return (
              <li key={l.slug + l.plan + l.tech} className="cart-line">
                <Link to={'/producto/' + l.slug} className="cart-thumb" tabIndex={-1}><Mockup kind={l.kind} seed={l.slug} /></Link>
                <div className="cart-info">
                  <Link to={'/producto/' + l.slug}><h3>{l.name}</h3></Link>
                  <div className="cart-opts">
                    <label><span>Plan</span>
                      <select value={l.plan} disabled={!d} onChange={(e) => changePlan(i, l, e.target.value)}>
                        {(d ? d.plans : [{ id: l.plan, name: l.plan_name }]).map((pl) => <option key={pl.id} value={pl.id}>{pl.name}{pl.price ? ` · ${money(pl.price)}` : ''}</option>)}
                      </select>
                    </label>
                    <label><span>Tecnología</span>
                      <select value={l.tech} disabled={!d} onChange={(e) => updateLine(i, { tech: e.target.value })}>
                        {(d ? d.techs : [l.tech]).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                    <div><span className="opt-label">{l.unit ? 'Meses' : 'Cantidad'}</span><Qty value={l.qty} onChange={(v) => updateLine(i, { qty: v })} max={l.unit ? 24 : Math.max(1, d ? d.available : 24)} /></div>
                  </div>
                  <div className="cart-links">
                    <button className="link" onClick={() => saveForLater(i, l)}><Icon name="heart" size={14} /> Guardar para después</button>
                    <button className="link link-danger" onClick={() => removeLine(i)}><Icon name="trash" size={14} /> Eliminar</button>
                  </div>
                </div>
                <div className="cart-price">
                  <b className="mono">{money(l.price * l.qty)}</b>
                  {l.qty > 1 && <small className="muted">{money(l.price)} c/u</small>}
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="cart-side">
          <div className="panel">
            <h2>Resumen</h2>
            <DeliveryOptions quote={q.quote} delivery={q.delivery} setDelivery={q.setDelivery} />
            <CouponBox coupon={q.coupon} setCoupon={q.setCoupon} quote={q.quote} />
            {q.error && <Alert tone="danger">{q.error}</Alert>}
            <Summary quote={q.quote} loading={q.loading}>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => nav('/pago')} disabled={!q.quote}>Continuar al pago <Icon name="arrow" size={18} /></button>
              <p className="tiny muted center"><Icon name="lock" size={13} /> Pago seguro · Cancelación sin costo en 5 días hábiles</p>
            </Summary>
          </div>
        </aside>
      </div>
    </div>
  );
}
