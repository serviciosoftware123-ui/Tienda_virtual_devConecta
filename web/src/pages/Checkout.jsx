import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, Field, Alert, Empty, Modal } from '../components/ui.jsx';
import { PaymentSection } from '../components/Orders.jsx';
import Mockup from '../components/Mockup.jsx';
import { useQuote, DeliveryOptions, CouponBox, Summary } from './Cart.jsx';
import { Logo } from '../components/Layout.jsx';

const EMPTY_BILL = { razon: '', rfc: '', street: '', city: '', state: 'Tabasco', zip: '' };

export default function Checkout() {
  const { cart, user, clearCart, toast } = useStore();
  const nav = useNavigate();
  const q = useQuote(cart);
  const [mode, setMode] = useState(user ? 'user' : 'guest');
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' });
  const [invoice, setInvoice] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrId, setAddrId] = useState('new');
  const [bill, setBill] = useState(EMPTY_BILL);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState(null);
  const showPolicy = (slug) => (e) => { e.preventDefault(); api('/policies').then((all) => setPolicy(all[slug])).catch(() => {}); };

  useEffect(() => {
    if (!user) return;
    setMode('user');
    setContact({ name: user.name || '', email: user.email || '', phone: user.phone || '', company: user.company || '' });
    api('/me/addresses').then((a) => { setAddresses(a); if (a.length) { setAddrId(String(a[0].id)); } }).catch(() => {});
  }, [user]);

  if (!cart.length) return <div className="wrap page"><Empty icon="cart" title="No hay nada que pagar" action={<Link to="/catalogo" className="btn btn-primary">Ver paquetes</Link>}>Agrega un paquete al carrito para continuar.</Empty></div>;

  const validate = () => {
    const e = {};
    if (contact.name.trim().length < 3) e.name = 'Escribe tu nombre completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) e.email = 'Escribe un correo válido; ahí te enviamos el folio.';
    if (contact.phone.replace(/\D/g, '').length !== 10) e.phone = 'Escribe 10 dígitos.';
    if (invoice && addrId === 'new') {
      if (bill.razon.trim().length < 3) e.razon = 'Escribe la razón social o tu nombre.';
      if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(bill.rfc)) e.rfc = 'RFC de 12 (empresa) o 13 (persona) caracteres.';
      if (!/^\d{5}$/.test(bill.zip)) e.zip = '5 dígitos.';
      if (!bill.street.trim()) e.street = 'Escribe la calle y número.';
      if (!bill.city.trim()) e.city = 'Escribe la ciudad.';
    }
    if (!accept) e.accept = 'Necesitamos que aceptes los términos para continuar.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const billing = () => {
    if (!invoice) return null;
    if (addrId !== 'new') { const a = addresses.find((x) => String(x.id) === addrId); return a ? { razon: a.razon || contact.name, rfc: a.rfc, street: a.street, city: a.city, state: a.state, zip: a.zip } : null; }
    return { ...bill, rfc: bill.rfc.toUpperCase() };
  };

  const check = () => {
    const ok = validate();
    if (!ok) { setFormError('Revisa los campos marcados antes de pagar.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    return ok;
  };
  const pay = async (payment) => {
    setFormError('');
    setBusy(true);
    try {
      const order = await api('/orders', { method: 'POST', body: { items: cart, coupon: q.coupon, delivery: q.delivery, contact, billing: billing(), payment, accept } });
      clearCart();
      toast(order.status === 'anticipo_pagado' ? 'Pago aprobado. Tu proyecto ya está en marcha.' : 'Pedido registrado. Te falta completar el pago.');
      nav('/pedido/' + order.folio, { state: { order } });
      return null;
    } catch (e) {
      setFormError(e.message);
      return e.message;
    } finally { setBusy(false); }
  };

  const setC = (k) => (e) => setContact({ ...contact, [k]: e.target.value });
  const setB = (k) => (e) => setBill({ ...bill, [k]: e.target.value });

  return (
    <div className="checkout">
      <header className="checkout-bar"><div className="wrap row-between"><Logo /><span className="tiny muted"><Icon name="lock" size={14} /> Pago seguro</span><Link to="/carrito" className="link">Volver al carrito</Link></div></header>
      <div className="wrap checkout-grid">
        <div className="checkout-main">
          <h1>Finalizar pedido</h1>
          {formError && <Alert tone="danger">{formError}</Alert>}

          <section className="panel">
            <h2><span className="step-n">1</span> Tus datos</h2>
            {!user && (
              <div className="seg seg-wide" role="group" aria-label="Cómo quieres continuar">
                <button type="button" className={mode === 'guest' ? 'is-on' : ''} onClick={() => setMode('guest')}>Comprar como invitado</button>
                <Link to="/entrar?volver=/pago" className={mode === 'login' ? 'is-on' : ''}>Iniciar sesión</Link>
              </div>
            )}
            {user && <p className="tiny muted">Compras como <b>{user.email}</b>. Tu pedido aparecerá en Mi cuenta.</p>}
            <div className="grid-2">
              <Field label="Nombre completo" id="c-name" error={errors.name}><input id="c-name" autoComplete="name" value={contact.name} onChange={setC('name')} /></Field>
              <Field label="Empresa o negocio" id="c-co" optional><input id="c-co" autoComplete="organization" value={contact.company} onChange={setC('company')} /></Field>
              <Field label="Correo" id="c-mail" error={errors.email} hint={!user ? 'Te enviamos el folio para rastrear tu pedido.' : undefined}><input id="c-mail" type="email" autoComplete="email" value={contact.email} onChange={setC('email')} readOnly={!!user} /></Field>
              <Field label="Teléfono (WhatsApp)" id="c-tel" error={errors.phone}><input id="c-tel" type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={setC('phone')} placeholder="993 123 4567" /></Field>
            </div>
          </section>

          <section className="panel">
            <h2><span className="step-n">2</span> Entrega y facturación</h2>
            <DeliveryOptions quote={q.quote} delivery={q.delivery} setDelivery={q.setDelivery} />
            <label className="toggle-line"><input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> Necesito factura (CFDI 4.0)</label>
            {invoice && (
              <div className="invoice">
                {addresses.length > 0 && (
                  <Field label="Datos fiscales" id="addr">
                    <select id="addr" value={addrId} onChange={(e) => setAddrId(e.target.value)}>
                      {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.rfc || 'sin RFC'} · {a.city}</option>)}
                      <option value="new">Usar otros datos</option>
                    </select>
                  </Field>
                )}
                {addrId === 'new' && (
                  <div className="grid-2">
                    <Field label="Razón social" id="b-r" error={errors.razon}><input id="b-r" value={bill.razon} onChange={setB('razon')} /></Field>
                    <Field label="RFC" id="b-rfc" error={errors.rfc}><input id="b-rfc" value={bill.rfc} onChange={(e) => setBill({ ...bill, rfc: e.target.value.toUpperCase() })} maxLength={13} /></Field>
                    <Field label="Calle y número" id="b-s" error={errors.street}><input id="b-s" autoComplete="street-address" value={bill.street} onChange={setB('street')} /></Field>
                    <Field label="Ciudad" id="b-c" error={errors.city}><input id="b-c" autoComplete="address-level2" value={bill.city} onChange={setB('city')} /></Field>
                    <Field label="Estado" id="b-st"><input id="b-st" autoComplete="address-level1" value={bill.state} onChange={setB('state')} /></Field>
                    <Field label="Código postal" id="b-z" error={errors.zip}><input id="b-z" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={bill.zip} onChange={setB('zip')} /></Field>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <h2><span className="step-n">3</span> Pago del anticipo</h2>
            <label className={'toggle-line accept' + (errors.accept ? ' has-error' : '')}>
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>Acepto los <button type="button" className="link" onClick={showPolicy('terminos')}>términos</button>, la <button type="button" className="link" onClick={showPolicy('devoluciones')}>política de cancelación</button> y el <button type="button" className="link" onClick={showPolicy('privacidad')}>aviso de privacidad</button>.</span>
            </label>
            {errors.accept && <p className="field-error">{errors.accept}</p>}
            {q.quote && <PaymentSection amount={q.quote.totals.anticipo} onPay={pay} onValidate={check} busy={busy} submitLabel={`Pagar anticipo de ${money(q.quote.totals.anticipo, { decimals: 2 })}`} />}
          </section>
        </div>

        <aside className="checkout-side">
          <div className="panel">
            <h2>Resumen del pedido</h2>
            <ul className="sum-lines">
              {cart.map((l) => (
                <li key={l.slug + l.plan + l.tech}>
                  <span className="mini-thumb"><Mockup kind={l.kind} seed={l.slug} /><i className="mono">{l.qty}</i></span>
                  <span><b>{l.name}</b><small>{l.plan_name} · {l.tech}{l.unit ? ` · ${l.qty} ${l.qty === 1 ? l.unit : l.unit + 'es'}` : ''}</small></span>
                  <span className="mono">{money(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <CouponBox coupon={q.coupon} setCoupon={q.setCoupon} quote={q.quote} />
            {q.error && <Alert tone="danger">{q.error}</Alert>}
            <Summary quote={q.quote} loading={q.loading} />
          </div>
          <div className="panel policies-mini">
            <h3>Antes de pagar</h3>
            <p><Icon name="clock" size={16} /> <b>Entrega:</b> el plazo cuenta desde que confirmamos el anticipo. <button type="button" className="link" onClick={showPolicy('entregas')}>Política de entregas</button></p>
            <p><Icon name="shield" size={16} /> <b>Cancelación:</b> sin costo dentro de 5 días hábiles; después, devolvemos el anticipo menos el trabajo entregado. <button type="button" className="link" onClick={showPolicy('devoluciones')}>Política de devoluciones</button></p>
            <p><Icon name="lock" size={16} /> <b>Privacidad:</b> no guardamos datos de tu tarjeta. <button type="button" className="link" onClick={showPolicy('privacidad')}>Aviso de privacidad</button></p>
          </div>
        </aside>
      </div>
      <Modal open={!!policy} onClose={() => setPolicy(null)} title={policy ? policy.title : ''}>
        {policy && policy.sections.map(([h, t]) => <div key={h}><h3>{h}</h3><p>{t}</p></div>)}
      </Modal>
    </div>
  );
}
