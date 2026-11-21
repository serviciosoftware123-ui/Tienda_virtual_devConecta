import { useState } from 'react';
import { Link } from 'react-router-dom';
import { money, date, METHOD_NAMES, STATUS } from '../lib/format.js';
import { Icon, Modal, Field, Badge, Alert } from './ui.jsx';
import { cardBrand } from '@shared/logic.mjs';

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'neutral' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// Línea de tiempo del avance del proyecto (el "tracking" de un servicio).
export function Tracker({ order }) {
  const cancelled = order.status === 'cancelado';
  return (
    <ol className={'tracker' + (cancelled ? ' is-cancelled' : '')} aria-label="Avance del proyecto">
      {order.stages.map((st) => {
        const state = cancelled ? 'todo' : st.id < order.stage ? 'done' : st.id === order.stage ? 'now' : 'todo';
        return (
          <li key={st.id} className={'tracker-step is-' + state} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="tracker-dot">{state === 'done' ? <Icon name="check" size={14} /> : null}</span>
            <div><b>{st.name}</b>{state === 'now' && <p className="tiny muted">{st.detail}</p>}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentRefs({ payments }) {
  const pend = payments.filter((p) => p.status === 'pendiente');
  if (!pend.length) return null;
  return pend.map((p) => (
    <Alert key={p.ref} tone="warn">
      {p.method === 'spei' ? (
        <><b>Transfiere {money(p.amount)} por SPEI</b> a la CLABE <span className="mono">{p.clabe}</span> (STP · DevConecta). Referencia: <span className="mono">{p.ref}</span>. Tienes hasta el {date(p.expires)}. Confirmaremos tu pago en cuanto se refleje.</>
      ) : (
        <><b>Paga {money(p.amount)} en cualquier OXXO</b> con la referencia <span className="mono">{p.oxxo_ref.replace(/(\d{4})/g, '$1 ').trim()}</span>. Vence el {date(p.expires)}. La tienda cobra una comisión aparte.</>
      )}
    </Alert>
  ));
}

export function PaymentsTable({ payments }) {
  return (
    <table className="table">
      <thead><tr><th>Concepto</th><th>Método</th><th>Estado</th><th className="num">Monto</th></tr></thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.ref}>
            <td>{p.type === 'anticipo' ? 'Anticipo 50 %' : 'Saldo 50 %'}<br /><small className="muted mono">{p.ref}</small></td>
            <td>{METHOD_NAMES[p.method]}{p.last4 ? ` ${p.brand} •••• ${p.last4}` : ''}</td>
            <td><Badge tone={p.status === 'aprobado' ? 'ok' : 'warn'}>{p.status === 'aprobado' ? 'Aprobado' : 'Pendiente'}</Badge></td>
            <td className="num mono">{money(p.amount, { decimals: 2 })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OrderTotals({ o, compact }) {
  return (
    <dl className="totals">
      <div><dt>Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
      {o.discount > 0 && <div className="is-discount"><dt>Descuento{o.coupon ? ` (${o.coupon})` : ''}</dt><dd>−{money(o.discount)}</dd></div>}
      <div><dt>Entrega {o.delivery ? o.delivery.label.toLowerCase() : ''}</dt><dd>{o.delivery_cost > 0 ? money(o.delivery_cost) : 'Sin costo'}</dd></div>
      <div><dt>IVA 16 %</dt><dd>{money(o.iva, { decimals: 2 })}</dd></div>
      <div className="is-total"><dt>Total</dt><dd>{money(o.total, { decimals: 2 })}</dd></div>
      {!compact && <div><dt>Pagado</dt><dd>{money(o.paid, { decimals: 2 })}</dd></div>}
      {!compact && <div className="is-strong"><dt>Saldo pendiente</dt><dd>{money(Math.max(0, o.total - o.paid), { decimals: 2 })}</dd></div>}
    </dl>
  );
}

const METHODS = [
  { id: 'tarjeta', label: 'Tarjeta', icon: 'card', note: 'Crédito o débito' },
  { id: 'mercadopago', label: 'Mercado Pago', icon: 'shield', note: 'Saldo o tarjeta guardada' },
  { id: 'paypal', label: 'PayPal', icon: 'globe', note: 'Con tu cuenta PayPal' },
  { id: 'spei', label: 'SPEI', icon: 'layers', note: 'Transferencia, confirmación manual' },
  { id: 'oxxo', label: 'OXXO', icon: 'bag', note: 'Efectivo, vence en 3 días' }
];

const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

// Selector de método de pago + flujo simulado (3-D Secure, redirección a pasarela).
export function PaymentSection({ amount, onPay, busy, disabled, submitLabel, onValidate }) {
  const [method, setMethod] = useState('tarjeta');
  const [card, setCard] = useState({ name: '', number: '', exp: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(null); // '3ds' | 'gateway'
  const [otp, setOtp] = useState('');
  const [modalErr, setModalErr] = useState('');

  const validateCard = () => {
    const e = {};
    const n = card.number.replace(/\D/g, '');
    if (card.name.trim().length < 3) e.name = 'Escribe el nombre como aparece en la tarjeta.';
    if (n.length < 13) e.number = 'Escribe los 16 dígitos de la tarjeta.';
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) e.exp = 'Usa el formato MM/AA.';
    if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = '3 o 4 dígitos.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const start = (e) => {
    e.preventDefault();
    if (disabled) return;
    setModalErr('');
    if (onValidate && !onValidate()) return;
    if (method === 'tarjeta') { if (validateCard()) { setOtp(''); setStep('3ds'); } return; }
    if (method === 'mercadopago' || method === 'paypal') { setStep('gateway'); return; }
    onPay({ method });
  };
  const finish = async (payment) => {
    setModalErr('');
    const err = await onPay(payment);
    if (err) setModalErr(err); else setStep(null);
  };

  const brand = cardBrand(card.number);
  return (
    <form onSubmit={start} noValidate>
      <div className="methods" role="radiogroup" aria-label="Método de pago">
        {METHODS.map((m) => (
          <label key={m.id} className={'method' + (method === m.id ? ' is-on' : '')}>
            <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
            <Icon name={m.icon} size={18} /><span><b>{m.label}</b><small>{m.note}</small></span>
          </label>
        ))}
      </div>

      {method === 'tarjeta' && (
        <div className="card-form">
          <Field label="Nombre en la tarjeta" id="cc-name" error={errors.name}>
            <input id="cc-name" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
          </Field>
          <Field label="Número de tarjeta" id="cc-num" error={errors.number} hint="Prueba: 4242 4242 4242 4242 (aprobada) · 4000 0000 0000 0002 (rechazada)">
            <div className="input-icon"><input id="cc-num" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} placeholder="0000 0000 0000 0000" /><span className="tiny mono">{card.number ? brand : ''}</span></div>
          </Field>
          <div className="grid-2">
            <Field label="Vencimiento" id="cc-exp" error={errors.exp}><input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} /></Field>
            <Field label="CVV" id="cc-cvv" error={errors.cvv}><input id="cc-cvv" inputMode="numeric" autoComplete="cc-csc" type="password" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} /></Field>
          </div>
          <p className="tiny muted"><Icon name="lock" size={14} /> Tus datos viajan cifrados a la pasarela. DevConecta no guarda el número completo ni el CVV.</p>
        </div>
      )}
      {(method === 'mercadopago' || method === 'paypal') && <Alert>Te llevaremos a {method === 'paypal' ? 'PayPal' : 'Mercado Pago'} para autorizar el pago y volverás aquí automáticamente.</Alert>}
      {method === 'spei' && <Alert>Al confirmar te damos una CLABE y una referencia. Tu proyecto inicia cuando confirmemos la transferencia (normalmente el mismo día hábil).</Alert>}
      {method === 'oxxo' && <Alert>Al confirmar te damos una referencia para pagar en efectivo en cualquier OXXO. Tienes 3 días hábiles.</Alert>}

      <button className="btn btn-primary btn-lg btn-block" disabled={busy || disabled}>
        <Icon name="lock" size={18} /> {busy ? 'Procesando…' : submitLabel || `Pagar ${money(amount, { decimals: 2 })}`}
      </button>

      <Modal open={step === '3ds'} onClose={() => !busy && setStep(null)} title="Verificación de tu banco (3-D Secure)">
        <p>Tu banco envió un código a tu celular para autorizar el cargo de <b>{money(amount, { decimals: 2 })}</b> a DevConecta.</p>
        <Field label="Código de verificación" id="otp" hint="En esta demostración el código es 123456." error={modalErr}>
          <input id="otp" inputMode="numeric" maxLength={6} className="otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy || otp.length < 6} onClick={() => finish({ method: 'tarjeta', card: { ...card, number: card.number.replace(/\s/g, ''), otp } })}>{busy ? 'Autorizando…' : 'Autorizar pago'}</button>
      </Modal>
      <Modal open={step === 'gateway'} onClose={() => !busy && setStep(null)} title={method === 'paypal' ? 'PayPal' : 'Mercado Pago'}>
        <div className="gateway">
          <p className="muted">Pago simulado · {method === 'paypal' ? 'paypal.com' : 'mercadopago.com.mx'}</p>
          <p className="gateway-amount">{money(amount, { decimals: 2 })}</p>
          <p>Comercio: <b>DevConecta</b></p>
          {modalErr && <p className="field-error">{modalErr}</p>}
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => finish({ method })}>{busy ? 'Confirmando…' : 'Confirmar pago'}</button>
          <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => setStep(null)}>Cancelar y volver</button>
        </div>
      </Modal>
    </form>
  );
}

export function OrderItems({ items }) {
  return (
    <ul className="order-items">
      {items.map((i, k) => (
        <li key={k}>
          <div><Link to={'/producto/' + i.slug}><b>{i.name}</b></Link><small className="muted">Plan {i.plan_name} · {i.tech} · {i.qty} {i.unit ? (i.qty === 1 ? i.unit : i.unit + 'es') : i.qty === 1 ? 'proyecto' : 'proyectos'}</small></div>
          <span className="mono">{money(i.price * i.qty)}</span>
        </li>
      ))}
    </ul>
  );
}
