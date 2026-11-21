import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { money, date } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, Empty, Field, Alert, Modal, Spinner, Badge } from '../components/ui.jsx';
import { Tracker, StatusBadge, PaymentRefs, PaymentsTable, OrderTotals, OrderItems, PaymentSection } from '../components/Orders.jsx';
import PackageCard from '../components/PackageCard.jsx';
import Mockup from '../components/Mockup.jsx';

function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = () => api(path).then(setData).catch((e) => setError(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);
  return [data, reload, error, setData];
}

function OrderRow({ o }) {
  const pct = o.status === 'cancelado' ? 0 : Math.round((o.stage / 6) * 100);
  return (
    <Link to={'/cuenta/pedidos/' + o.folio} className="order-row">
      <span className="mini-thumb"><Mockup kind={o.items[0].kind} seed={o.items[0].slug} /></span>
      <div className="order-row-main">
        <b>{o.items.map((i) => i.name).join(', ')}</b>
        <small className="muted"><span className="mono">{o.folio}</span> · {date(o.created_at)}</small>
        <div className="progress" aria-label={`Avance ${pct} %`}><span style={{ width: pct + '%' }} /></div>
        <small>{o.status === 'cancelado' ? 'Cancelado' : o.stages[o.stage].name}</small>
      </div>
      <div className="order-row-side"><StatusBadge status={o.status} /><b className="mono">{money(o.total, { decimals: 2 })}</b></div>
      <Icon name="right" size={18} />
    </Link>
  );
}

function Overview() {
  const { user } = useStore();
  const [orders] = useLoad('/me/orders');
  const active = (orders || []).filter((o) => o.status !== 'cancelado' && o.stage < 6);
  const due = (orders || []).filter((o) => o.stage === 5 && o.total - o.paid > 0.01);
  return (
    <div className="stack">
      <h1>Hola, {user.name.split(' ')[0]}</h1>
      {due.map((o) => <Alert key={o.folio} tone="warn"><b>Tu proyecto {o.folio} está listo para entrega.</b> Revisa el resultado y paga el saldo de {money(o.total - o.paid, { decimals: 2 })} para recibir código y accesos. <Link to={'/cuenta/pedidos/' + o.folio}>Ver pedido</Link></Alert>)}
      <div className="kpis">
        <div className="kpi"><span>Proyectos en curso</span><b className="mono">{orders ? active.length : '…'}</b></div>
        <div className="kpi"><span>Pedidos totales</span><b className="mono">{orders ? orders.length : '…'}</b></div>
        <div className="kpi"><span>Saldo por pagar</span><b className="mono">{orders ? money(orders.filter((o) => o.status !== 'cancelado').reduce((s, o) => s + o.total - o.paid, 0), { decimals: 2 }) : '…'}</b></div>
      </div>
      <section className="panel">
        <div className="row-between"><h2>Proyectos en curso</h2><Link to="/cuenta/pedidos" className="link-arrow">Todos los pedidos <Icon name="arrow" size={16} /></Link></div>
        {!orders ? <Spinner /> : active.length ? active.map((o) => <OrderRow key={o.folio} o={o} />) : <Empty icon="box" title="No tienes proyectos en curso" action={<Link to="/catalogo" className="btn btn-primary">Ver paquetes</Link>}>Cuando contrates un paquete verás aquí su avance.</Empty>}
      </section>
    </div>
  );
}

function Orders() {
  const [orders, , error] = useLoad('/me/orders');
  const [filter, setFilter] = useState('todos');
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!orders) return <Spinner />;
  const list = orders.filter((o) => filter === 'todos' || (filter === 'curso' ? o.status !== 'cancelado' && o.stage < 6 : filter === 'entregados' ? o.stage === 6 : o.status === 'cancelado'));
  return (
    <div className="stack">
      <h1>Historial de pedidos</h1>
      <div className="seg" role="group" aria-label="Filtrar pedidos">
        {[['todos', 'Todos'], ['curso', 'En curso'], ['entregados', 'Entregados'], ['cancelados', 'Cancelados']].map(([k, l]) => <button key={k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {list.length ? <div className="panel">{list.map((o) => <OrderRow key={o.folio} o={o} />)}</div>
        : <Empty icon="box" title={orders.length ? 'No hay pedidos con este filtro' : 'Aún no tienes pedidos'} action={!orders.length && <Link to="/catalogo" className="btn btn-primary">Ver paquetes</Link>} />}
    </div>
  );
}

function OrderDetail() {
  const { folio } = useParams();
  const { toast } = useStore();
  const [o, reload, error, setO] = useLoad('/me/orders/' + folio, [folio]);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  if (error) return <Empty icon="alert" title="No encontramos ese pedido" action={<Link to="/cuenta/pedidos" className="btn btn-primary">Mis pedidos</Link>}>{error}</Empty>;
  if (!o) return <Spinner />;
  const saldo = Math.max(0, o.total - o.paid);
  const pay = async (payment) => {
    setBusy(true);
    try { const r = await api(`/me/orders/${folio}/pay`, { method: 'POST', body: { payment } }); setO(r); setPaying(false); toast(r.status === 'pagado' ? 'Saldo pagado. Te enviamos código, accesos y factura.' : 'Pago registrado; falta confirmarlo.'); return null; }
    catch (e) { return e.message; } finally { setBusy(false); }
  };
  const doCancel = async () => {
    setBusy(true); setMsg('');
    try { await api(`/me/orders/${folio}/cancel`, { method: 'POST', body: { reason } }); setCancel(false); toast('Pedido cancelado. Te devolveremos el anticipo en hasta 10 días hábiles.'); reload(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="stack">
      <Link to="/cuenta/pedidos" className="link"><Icon name="left" size={14} /> Mis pedidos</Link>
      <div className="row-between wrap-gap">
        <div><h1>Pedido <span className="mono">{o.folio}</span></h1><p className="muted">Hecho el {date(o.created_at)} · Entrega estimada {date(o.delivery.eta)}</p></div>
        <StatusBadge status={o.status} />
      </div>
      <PaymentRefs payments={o.payments} />
      {o.stage === 5 && saldo > 0.01 && o.status !== 'cancelado' && (
        <Alert tone="warn"><b>Tu proyecto está listo.</b> Revisa la versión de prueba que te enviamos por correo y paga el saldo de {money(saldo, { decimals: 2 })} para recibir el código y los accesos. <button className="link" onClick={() => setPaying(true)}>Pagar saldo</button></Alert>
      )}
      <div className="detail-grid">
        <section className="panel"><h2>Seguimiento del proyecto</h2><Tracker order={o} />{o.notes && <p className="tiny muted">Nota: {o.notes}</p>}</section>
        <section className="panel"><h2>Paquetes</h2><OrderItems items={o.items} /><OrderTotals o={o} /></section>
      </div>
      <section className="panel"><h2>Pagos</h2><PaymentsTable payments={o.payments} /></section>
      {o.billing && <section className="panel"><h2>Facturación</h2><p>{o.billing.razon} · RFC <span className="mono">{o.billing.rfc}</span><br />{o.billing.street}, {o.billing.city}, {o.billing.state}, C.P. {o.billing.zip}</p></section>}
      <div className="row-gap">
        {o.stage === 5 && saldo > 0.01 && o.status !== 'cancelado' && <button className="btn btn-primary" onClick={() => setPaying(true)}>Pagar saldo de {money(saldo, { decimals: 2 })}</button>}
        <Link to={'/contacto?folio=' + o.folio} className="btn btn-ghost">Necesito ayuda con este pedido</Link>
        {o.stage < 3 && o.status !== 'cancelado' && <button className="btn btn-ghost btn-danger" onClick={() => setCancel(true)}>Solicitar cancelación</button>}
      </div>
      <Modal open={paying} onClose={() => !busy && setPaying(false)} title="Pagar saldo">
        <p>Saldo del pedido <span className="mono">{o.folio}</span>: <b>{money(saldo, { decimals: 2 })}</b></p>
        <PaymentSection amount={saldo} onPay={pay} busy={busy} submitLabel={`Pagar ${money(saldo, { decimals: 2 })}`} />
      </Modal>
      <Modal open={cancel} onClose={() => !busy && setCancel(false)} title="Cancelar pedido">
        <p>{o.stage <= 1 ? 'Si estás dentro de los 5 días hábiles posteriores al pago, te devolvemos el anticipo completo.' : 'Como el proyecto ya avanzó, devolveremos el anticipo menos el trabajo entregado.'}</p>
        <Field label="¿Por qué cancelas?" id="cx" optional><textarea id="cx" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {msg && <Alert tone="danger">{msg}</Alert>}
        <div className="row-gap"><button className="btn btn-danger" disabled={busy} onClick={doCancel}>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</button><button className="btn btn-ghost" onClick={() => setCancel(false)}>Conservar pedido</button></div>
      </Modal>
    </div>
  );
}

function Wishlist() {
  const { wish } = useStore();
  const [items, reload] = useLoad('/me/wishlist');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [wish.length]);
  return (
    <div className="stack">
      <h1>Lista de deseos</h1>
      {!items ? <Spinner /> : items.length ? <div className="grid-cards grid-3">{items.filter((p) => wish.includes(p.slug)).map((p) => <PackageCard key={p.slug} p={p} />)}</div>
        : <Empty icon="heart" title="Tu lista de deseos está vacía" action={<Link to="/catalogo" className="btn btn-primary">Explorar paquetes</Link>}>Toca el corazón de cualquier paquete para guardarlo y compararlo después.</Empty>}
    </div>
  );
}

function Profile() {
  const { user, setUser, toast } = useStore();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', company: user.company || '', rfc: user.rfc || '' });
  const [p, setP] = useState({ current: '', next: '' });
  const [err, setErr] = useState(''); const [perr, setPerr] = useState('');
  const save = async (e) => { e.preventDefault(); setErr(''); try { setUser(await api('/me', { method: 'PUT', body: f })); toast('Guardamos tus datos.'); } catch (x) { setErr(x.message); } };
  const savePass = async (e) => { e.preventDefault(); setPerr(''); try { await api('/me/password', { method: 'PUT', body: p }); setP({ current: '', next: '' }); toast('Actualizamos tu contraseña.'); } catch (x) { setPerr(x.message); } };
  return (
    <div className="stack">
      <h1>Información personal</h1>
      <form className="panel" onSubmit={save}>
        {err && <Alert tone="danger">{err}</Alert>}
        <div className="grid-2">
          <Field label="Nombre completo" id="p-n"><input id="p-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Correo" id="p-e" hint="Para cambiar tu correo escríbenos."><input id="p-e" value={user.email} readOnly /></Field>
          <Field label="Teléfono" id="p-t"><input id="p-t" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Empresa" id="p-c" optional><input id="p-c" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="RFC" id="p-r" optional><input id="p-r" value={f.rfc} maxLength={13} onChange={(e) => setF({ ...f, rfc: e.target.value.toUpperCase() })} /></Field>
        </div>
        <button className="btn btn-primary">Guardar cambios</button>
      </form>
      <form className="panel" onSubmit={savePass}>
        <h2>Contraseña</h2>
        {perr && <Alert tone="danger">{perr}</Alert>}
        <div className="grid-2">
          <Field label="Contraseña actual" id="p-o"><input id="p-o" type="password" autoComplete="current-password" value={p.current} onChange={(e) => setP({ ...p, current: e.target.value })} /></Field>
          <Field label="Nueva contraseña" id="p-x" hint="8 caracteres o más, con letras y números."><input id="p-x" type="password" autoComplete="new-password" value={p.next} onChange={(e) => setP({ ...p, next: e.target.value })} /></Field>
        </div>
        <button className="btn btn-ghost">Cambiar contraseña</button>
      </form>
    </div>
  );
}

const EMPTY_ADDR = { label: '', razon: '', rfc: '', street: '', city: '', state: 'Tabasco', zip: '', is_default: false };
function Addresses() {
  const { toast } = useStore();
  const [list, reload] = useLoad('/me/addresses');
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (edit.id) await api('/me/addresses/' + edit.id, { method: 'PUT', body: edit }); else await api('/me/addresses', { method: 'POST', body: edit });
      setEdit(null); toast('Dirección guardada.'); reload();
    } catch (x) { setErr(x.message); }
  };
  const del = async (a) => { await api('/me/addresses/' + a.id, { method: 'DELETE' }); toast('Dirección eliminada.'); reload(); };
  const s = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <div className="stack">
      <div className="row-between"><h1>Direcciones y datos fiscales</h1><button className="btn btn-primary" onClick={() => { setErr(''); setEdit({ ...EMPTY_ADDR }); }}><Icon name="plus" size={16} /> Agregar</button></div>
      <p className="muted">Las usamos para tus facturas CFDI y para las reuniones presenciales de tu proyecto.</p>
      {!list ? <Spinner /> : list.length ? (
        <div className="addr-grid">
          {list.map((a) => (
            <article key={a.id} className="panel addr">
              <div className="row-between"><b>{a.label}</b>{a.is_default && <Badge tone="accent">Predeterminada</Badge>}</div>
              {a.razon && <p>{a.razon}</p>}
              {a.rfc && <p className="mono tiny">RFC {a.rfc}</p>}
              <p className="muted">{a.street}<br />{a.city}, {a.state}, C.P. {a.zip}</p>
              <div className="row-gap"><button className="link" onClick={() => { setErr(''); setEdit({ ...a, razon: a.razon || '', rfc: a.rfc || '' }); }}><Icon name="edit" size={14} /> Editar</button><button className="link link-danger" onClick={() => del(a)}><Icon name="trash" size={14} /> Eliminar</button></div>
            </article>
          ))}
        </div>
      ) : <Empty icon="pin" title="Aún no guardas direcciones">Agrega tus datos fiscales para facturar más rápido en el checkout.</Empty>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && edit.id ? 'Editar dirección' : 'Nueva dirección'}>
        {edit && (
          <form onSubmit={save} className="stack">
            {err && <Alert tone="danger">{err}</Alert>}
            <Field label="Nombre para identificarla" id="a-l"><input id="a-l" value={edit.label} onChange={s('label')} placeholder="Oficina, Sucursal centro…" /></Field>
            <div className="grid-2">
              <Field label="Razón social" id="a-r" optional><input id="a-r" value={edit.razon} onChange={s('razon')} /></Field>
              <Field label="RFC" id="a-f" optional><input id="a-f" value={edit.rfc} maxLength={13} onChange={(e) => setEdit({ ...edit, rfc: e.target.value.toUpperCase() })} /></Field>
            </div>
            <Field label="Calle y número" id="a-s"><input id="a-s" value={edit.street} onChange={s('street')} /></Field>
            <div className="grid-3">
              <Field label="Ciudad" id="a-c"><input id="a-c" value={edit.city} onChange={s('city')} /></Field>
              <Field label="Estado" id="a-e"><input id="a-e" value={edit.state} onChange={s('state')} /></Field>
              <Field label="C.P." id="a-z"><input id="a-z" inputMode="numeric" maxLength={5} value={edit.zip} onChange={s('zip')} /></Field>
            </div>
            <label className="toggle-line"><input type="checkbox" checked={!!edit.is_default} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} /> Usar como predeterminada</label>
            <button className="btn btn-primary">Guardar dirección</button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Preferences() {
  const { toast } = useStore();
  const [prefs, , , setPrefs] = useLoad('/me/preferences');
  const [saving, setSaving] = useState(false);
  if (!prefs) return <Spinner />;
  const toggle = async (k) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next); setSaving(true);
    try { await api('/me/preferences', { method: 'PUT', body: next }); toast('Preferencias actualizadas.'); }
    catch (e) { setPrefs(prefs); toast(e.message, { tone: 'danger' }); } finally { setSaving(false); }
  };
  const rows = [
    ['avance_email', 'Avance de mis proyectos por correo', 'Te avisamos cada vez que tu proyecto cambia de etapa.'],
    ['avance_whatsapp', 'Avance de mis proyectos por WhatsApp', 'Mensajes breves al número de tu cuenta.'],
    ['newsletter', 'Guía mensual', 'Un correo al mes con consejos para vender en línea.'],
    ['promos', 'Ofertas y cupones', 'Solo cuando haya descuentos en paquetes.']
  ];
  return (
    <div className="stack">
      <h1>Preferencias de comunicación</h1>
      <div className="panel">
        {rows.map(([k, t, d]) => (
          <label key={k} className="switch-row">
            <span><b>{t}</b><small className="muted">{d}</small></span>
            <span className="switch"><input type="checkbox" role="switch" checked={!!prefs[k]} onChange={() => toggle(k)} disabled={saving} /><span /></span>
          </label>
        ))}
      </div>
      <p className="tiny muted">Los avisos sobre pagos y facturas se envían siempre, porque son parte del servicio. Puedes ejercer tus derechos ARCO desde <Link to="/contacto">Contacto</Link>.</p>
    </div>
  );
}

export default function Account() {
  const { user, ready, logout } = useStore();
  if (!ready) return <div className="wrap page"><Spinner /></div>;
  if (!user) return <Navigate to="/entrar?volver=/cuenta" replace />;
  const links = [['', 'Resumen', 'grid'], ['pedidos', 'Pedidos y seguimiento', 'box'], ['deseos', 'Lista de deseos', 'heart'], ['datos', 'Información personal', 'user'], ['direcciones', 'Direcciones y facturación', 'pin'], ['preferencias', 'Preferencias', 'bell']];
  return (
    <div className="wrap page account">
      <aside className="account-nav">
        <div className="account-who"><span className="avatar">{user.name[0]}</span><div><b>{user.name}</b><small className="muted">{user.email}</small></div></div>
        <nav aria-label="Mi cuenta">
          {links.map(([to, l, ic]) => <NavLink key={to} to={'/cuenta' + (to ? '/' + to : '')} end={!to}><Icon name={ic} size={18} />{l}</NavLink>)}
          {user.role === 'admin' && <NavLink to="/admin"><Icon name="admin" size={18} />Administración</NavLink>}
          <button onClick={logout}><Icon name="logout" size={18} />Cerrar sesión</button>
        </nav>
      </aside>
      <div className="account-main">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="pedidos/:folio" element={<OrderDetail />} />
          <Route path="deseos" element={<Wishlist />} />
          <Route path="datos" element={<Profile />} />
          <Route path="direcciones" element={<Addresses />} />
          <Route path="preferencias" element={<Preferences />} />
          <Route path="*" element={<Navigate to="/cuenta" replace />} />
        </Routes>
      </div>
    </div>
  );
}

