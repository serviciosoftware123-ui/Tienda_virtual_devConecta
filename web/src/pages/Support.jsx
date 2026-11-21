import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { date } from '../lib/format.js';
import { Icon, Field, Alert, Empty, Spinner, Crumbs } from '../components/ui.jsx';
import { Tracker, StatusBadge, OrderItems, OrderTotals, PaymentRefs } from '../components/Orders.jsx';

export function Help() {
  const [faq, setFaq] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { api('/faq').then(setFaq).catch(() => setFaq([])); }, []);
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const groups = useMemo(() => {
    if (!faq) return [];
    const list = faq.filter((f) => !q.trim() || norm(f.question + ' ' + f.answer).includes(norm(q.trim())));
    return [...new Set(list.map((f) => f.category))].map((c) => [c, list.filter((f) => f.category === c)]);
  }, [faq, q]);
  return (
    <div className="wrap page">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Centro de ayuda' }]} />
      <div className="help-hero">
        <h1>¿En qué te ayudamos?</h1>
        <div className="search help-search"><Icon name="search" size={18} className="search-icon" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca: anticipo, factura, cancelar…" aria-label="Buscar en preguntas frecuentes" /></div>
      </div>
      <div className="help-cards">
        <Link to="/rastrear" className="help-card"><Icon name="box" /><b>Rastrear pedido</b><span>Con tu folio y correo</span></Link>
        <Link to="/contacto" className="help-card"><Icon name="mail" /><b>Escribirnos</b><span>Respuesta en menos de 24 h hábiles</span></Link>
        <button className="help-card" onClick={() => document.querySelector('.chat-fab') && document.querySelector('.chat-fab').click()}><Icon name="chat" /><b>Chat</b><span>Respuestas al instante</span></button>
        <Link to="/politicas/devoluciones" className="help-card"><Icon name="shield" /><b>Cancelaciones</b><span>5 días hábiles sin costo</span></Link>
      </div>
      {!faq ? <Spinner /> : !groups.length ? <Empty icon="search" title="No encontramos esa pregunta" action={<Link to="/contacto" className="btn btn-primary">Preguntar a un asesor</Link>}>Prueba con otras palabras o escríbenos.</Empty> : (
        <div className="faq">
          {groups.map(([cat, items]) => (
            <section key={cat}>
              <h2>{cat}</h2>
              {items.map((f) => <details key={f.id} open={!!q.trim()}><summary>{f.question}<Icon name="down" size={18} /></summary><p>{f.answer}</p></details>)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function Contact() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', email: '', subject: params.get('folio') ? 'Mi pedido' : '', folio: params.get('folio') || '', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState(null);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api('/contact', { method: 'POST', body: f }); setTicket(r.ticket); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="wrap page">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Ayuda', to: '/ayuda' }, { label: 'Contacto' }]} />
      <div className="contact-grid">
        <div>
          <h1>Contáctanos</h1>
          <p className="lead">Cotizaciones a la medida, dudas sobre un pedido o soporte. Te contestamos en menos de 24 horas hábiles.</p>
          {ticket ? (
            <div className="panel done-inline"><span className="done-icon"><Icon name="check" size={24} /></span><div><h2>Recibimos tu mensaje</h2><p>Tu número de seguimiento es <b className="mono">{ticket}</b>. Te responderemos a <b>{f.email}</b>.</p><button className="link" onClick={() => { setTicket(null); setF({ ...f, message: '' }); }}>Enviar otro mensaje</button></div></div>
          ) : (
            <form className="panel" onSubmit={submit} noValidate>
              {err && <Alert tone="danger">{err}</Alert>}
              <div className="grid-2">
                <Field label="Nombre" id="ct-n"><input id="ct-n" autoComplete="name" value={f.name} onChange={s('name')} /></Field>
                <Field label="Correo" id="ct-e"><input id="ct-e" type="email" autoComplete="email" value={f.email} onChange={s('email')} /></Field>
                <Field label="Motivo" id="ct-s">
                  <select id="ct-s" value={f.subject} onChange={s('subject')}>
                    <option value="">Elige un motivo</option>
                    {['Cotización a la medida', 'Mi pedido', 'Pagos y facturación', 'Cancelación o devolución', 'Soporte técnico', 'Datos personales (ARCO)', 'Otro'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Folio del pedido" id="ct-f" optional><input id="ct-f" value={f.folio} onChange={s('folio')} placeholder="DC-…" /></Field>
              </div>
              <Field label="Mensaje" id="ct-m" hint={`${f.message.length}/1500`}><textarea id="ct-m" rows={6} maxLength={1500} value={f.message} onChange={s('message')} placeholder="Cuéntanos qué necesitas" /></Field>
              <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mensaje'}</button>
            </form>
          )}
        </div>
        <aside className="panel company">
          <h2>DevConecta</h2>
          <p><Icon name="pin" size={16} /> Av. Universidad s/n, Cunduacán, Tabasco, C.P. 86690</p>
          <p><Icon name="mail" size={16} /> hola@devconecta.mx</p>
          <p><Icon name="phone" size={16} /> WhatsApp 993 000 0000</p>
          <p><Icon name="clock" size={16} /> Lunes a viernes, 9:00 a 18:00 h</p>
          <hr />
          <p className="tiny muted">¿Dudas rápidas? Revisa las <Link to="/ayuda">preguntas frecuentes</Link> o abre el chat.</p>
        </aside>
      </div>
    </div>
  );
}

export function Policy() {
  const { slug } = useParams();
  const [all, setAll] = useState(null);
  useEffect(() => { api('/policies').then(setAll).catch(() => setAll({})); }, []);
  if (!all) return <div className="wrap page"><Spinner /></div>;
  const p = all[slug];
  if (!p) return <div className="wrap page"><Empty icon="search" title="No encontramos esa política" action={<Link to="/ayuda" className="btn btn-primary">Ir a ayuda</Link>} /></div>;
  return (
    <div className="wrap page policy-grid">
      <aside className="policy-nav">
        <p className="eyebrow">Políticas</p>
        {Object.entries(all).map(([k, v]) => <Link key={k} to={'/politicas/' + k} className={k === slug ? 'is-on' : ''}>{v.title}</Link>)}
      </aside>
      <article className="prose">
        <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Políticas' }, { label: p.title }]} />
        <h1>{p.title}</h1>
        <p className="muted tiny">Última actualización: noviembre de 2026</p>
        {p.sections.map(([h, t]) => <section key={h}><h2>{h}</h2><p>{t}</p></section>)}
        <Alert>¿Tienes dudas sobre esta política? <Link to="/contacto">Escríbenos</Link>.</Alert>
      </article>
    </div>
  );
}

export function About() {
  return (
    <div className="wrap page narrow prose">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Quiénes somos' }]} />
      <p className="eyebrow">Quiénes somos</p>
      <h1>Software a la medida, vendido como un producto</h1>
      <p className="lead">DevConecta nace en Cunduacán, Tabasco, para que las pymes compren desarrollo de software con la misma claridad con la que compran cualquier otra cosa en línea: precio cerrado, entregables definidos y fecha de entrega.</p>
      <h2>Cómo trabajamos</h2>
      <p>Cada paquete se desarrolla en cinco etapas: análisis, diseño, desarrollo, pruebas y entrega. Cobramos el 50 % para iniciar y el 50 % cuando apruebas el resultado. Tú ves el avance en tu cuenta en todo momento.</p>
      <h2>Lo que nos importa</h2>
      <ul className="check-grid">
        <li><Icon name="check" size={16} />Que el código y las cuentas queden a tu nombre.</li>
        <li><Icon name="check" size={16} />Tecnologías actuales y mantenibles: React, Node.js, PostgreSQL, Flutter, Docker.</li>
        <li><Icon name="check" size={16} />Cumplir la Ley Federal de Protección al Consumidor y la de datos personales.</li>
        <li><Icon name="check" size={16} />Hablar claro: sin tecnicismos innecesarios.</li>
      </ul>
      <h2>Datos de la empresa</h2>
      <table className="table spec-table"><tbody>
        <tr><th scope="row">Nombre comercial</th><td>DevConecta</td></tr>
        <tr><th scope="row">Domicilio</th><td>Av. Universidad s/n, Cunduacán, Tabasco, C.P. 86690</td></tr>
        <tr><th scope="row">Contacto</th><td>hola@devconecta.mx · WhatsApp 993 000 0000</td></tr>
        <tr><th scope="row">Horario</th><td>Lunes a viernes, 9:00 a 18:00 h</td></tr>
      </tbody></table>
      <Alert>Este sitio es un prototipo académico de la materia de Comercio Electrónico (UJAT). Los pagos son simulados y no se realizan cargos reales.</Alert>
    </div>
  );
}

export function Track() {
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState({ folio: params.get('folio') || '', email: params.get('email') || '' });
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e && e.preventDefault(); setErr(''); setBusy(true);
    try { setO(await api('/orders/track' + qs(f))); setParams(f); } catch (x) { setO(null); setErr(x.message); } finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (f.folio && f.email) submit(); }, []);
  return (
    <div className="wrap page narrow">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Rastrear pedido' }]} />
      <h1>Rastrear pedido</h1>
      <p className="muted">Escribe el folio que te enviamos por correo (empieza con DC-) y el correo con el que compraste.</p>
      <form className="panel track-form" onSubmit={submit}>
        <Field label="Folio" id="t-f"><input id="t-f" value={f.folio} onChange={(e) => setF({ ...f, folio: e.target.value.toUpperCase() })} placeholder="DC-261113-ABCD" /></Field>
        <Field label="Correo" id="t-e"><input id="t-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy || !f.folio || !f.email}>{busy ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {err && <Alert tone="danger">{err}</Alert>}
      {o && (
        <div className="stack">
          <div className="row-between"><h2>Pedido <span className="mono">{o.folio}</span></h2><StatusBadge status={o.status} /></div>
          <PaymentRefs payments={o.payments} />
          <div className="detail-grid">
            <section className="panel"><h3>Avance</h3><Tracker order={o} /><p className="tiny muted">Entrega estimada: {date(o.delivery.eta)}</p></section>
            <section className="panel"><h3>Resumen</h3><OrderItems items={o.items} /><OrderTotals o={o} /></section>
          </div>
          <p className="tiny muted"><Link to="/registro" state={{ email: o.email }}>Crea una cuenta</Link> con este correo para pagar el saldo y ver el historial completo.</p>
        </div>
      )}
    </div>
  );
}

export function NotFound() {
  return <div className="wrap page"><Empty icon="search" title="Esta página no existe" action={<Link to="/" className="btn btn-primary">Ir al inicio</Link>}>Quizá el enlace cambió. Busca el paquete desde el catálogo.</Empty></div>;
}
