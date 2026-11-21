import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { date } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, Empty, Spinner } from '../components/ui.jsx';
import { Tracker, PaymentRefs, OrderTotals, OrderItems, StatusBadge } from '../components/Orders.jsx';

export default function OrderDone() {
  const { folio } = useParams();
  const loc = useLocation();
  const { user } = useStore();
  const [o, setO] = useState(loc.state && loc.state.order);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (o || !user) return;
    api('/me/orders/' + folio).then(setO).catch((e) => setErr(e.message));
  }, [folio, o, user]);
  if (!o && !user) return <div className="wrap page"><Empty icon="box" title="Consulta tu pedido" action={<Link to="/rastrear" className="btn btn-primary">Rastrear pedido</Link>}>Usa tu folio {folio} y tu correo para ver el avance.</Empty></div>;
  if (err) return <div className="wrap page"><Empty icon="alert" title="No encontramos el pedido">{err}</Empty></div>;
  if (!o) return <div className="wrap page"><Spinner /></div>;
  const paid = o.status === 'anticipo_pagado';
  return (
    <div className="wrap page narrow">
      <div className="done-head">
        <span className={'done-icon' + (paid ? '' : ' is-warn')}><Icon name={paid ? 'check' : 'clock'} size={30} /></span>
        <h1>{paid ? '¡Listo! Tu proyecto ya está en marcha' : 'Pedido registrado: falta tu pago'}</h1>
        <p className="lead">Folio <b className="mono">{o.folio}</b> · enviamos los detalles a <b>{o.email}</b>.</p>
        <StatusBadge status={o.status} />
      </div>
      <PaymentRefs payments={o.payments} />
      <div className="done-grid">
        <section className="panel">
          <h2>Siguientes pasos</h2>
          <Tracker order={o} />
          <p className="tiny muted">Entrega estimada: <b>{date(o.delivery.eta)}</b> ({o.delivery.label.toLowerCase()}). Te escribiremos en 1 día hábil para agendar la reunión de análisis.</p>
        </section>
        <section className="panel">
          <h2>Resumen</h2>
          <OrderItems items={o.items} />
          <OrderTotals o={o} />
        </section>
      </div>
      <div className="done-actions">
        {user ? <Link to={'/cuenta/pedidos/' + o.folio} className="btn btn-primary">Ver mi pedido</Link>
          : <Link to="/registro" state={{ email: o.email }} className="btn btn-primary">Crear cuenta para seguir el avance</Link>}
        <Link to="/catalogo" className="btn btn-ghost">Seguir explorando</Link>
      </div>
    </div>
  );
}
