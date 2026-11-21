import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, DEMO } from '../lib/api.js';
import { money, date, METHOD_NAMES } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, Spinner, Alert, Field, Modal, Stars } from '../components/ui.jsx';
import { StatusBadge, OrderItems, OrderTotals, PaymentsTable } from '../components/Orders.jsx';
import { STAGES } from '@shared/logic.mjs';

function useList(path) {
  const [data, setData] = useState(null);
  const reload = () => api(path).then(setData).catch(() => setData([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [path]);
  return [data, reload];
}

function Summary() {
  const [s] = useList('/admin/summary');
  if (!s) return <Spinner />;
  return (
    <div className="kpis kpis-4">
      <div className="kpi"><span>Cobrado</span><b className="mono">{money(s.cobrado, { decimals: 2 })}</b></div>
      <div className="kpi"><span>Por cobrar</span><b className="mono">{money(s.por_cobrar, { decimals: 2 })}</b></div>
      <div className="kpi"><span>Proyectos en curso</span><b className="mono">{s.en_curso}</b></div>
      <div className="kpi"><span>Pagos por confirmar</span><b className="mono">{s.pagos_pendientes}</b></div>
      <div className="kpi"><span>Pedidos</span><b className="mono">{s.orders}</b></div>
      <div className="kpi"><span>Mensajes sin responder</span><b className="mono">{s.mensajes}</b></div>
      <div className="kpi"><span>Suscriptores</span><b className="mono">{s.suscriptores}</b></div>
    </div>
  );
}

function Orders() {
  const { toast } = useStore();
  const [list, reload] = useList('/admin/orders');
  const [open, setOpen] = useState(null);
  const act = async (o, body, msg) => {
    try { const r = await api('/admin/orders/' + o.folio, { method: 'PATCH', body }); toast(msg); reload(); if (open) setOpen(r); }
    catch (e) { toast(e.message, { tone: 'danger' }); }
  };
  if (!list) return <Spinner />;
  if (!list.length) return <Alert>Aún no hay pedidos. Haz una compra de prueba desde la tienda.</Alert>;
  return (
    <>
      <div className="table-scroll">
        <table className="table admin-table">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Paquetes</th><th>Estado</th><th>Etapa</th><th className="num">Total</th><th className="num">Pagado</th><th /></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.folio}>
                <td className="mono"><button className="link" onClick={() => setOpen(o)}>{o.folio}</button><br /><small className="muted">{date(o.created_at, { day: 'numeric', month: 'short' })}</small></td>
                <td>{o.contact.name}<br /><small className="muted">{o.email}</small></td>
                <td>{o.items.map((i) => i.name).join(', ')}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>
                  <select value={o.stage} disabled={o.status === 'cancelado'} onChange={(e) => act(o, { stage: e.target.value }, 'Etapa actualizada. El cliente ya lo ve en su cuenta.')} aria-label={'Etapa de ' + o.folio}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}
                  </select>
                </td>
                <td className="num mono">{money(o.total, { decimals: 2 })}</td>
                <td className="num mono">{money(o.paid, { decimals: 2 })}</td>
                <td>{o.payments.some((p) => p.status === 'pendiente') && o.status !== 'cancelado' && <button className="btn btn-sm btn-primary" onClick={() => act(o, { confirm_payment: true }, 'Pago confirmado.')}>Confirmar pago</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? 'Pedido ' + open.folio : ''} wide>
        {open && (
          <div className="stack">
            <p>{open.contact.name} · {open.email} · {open.contact.phone}{open.contact.company ? ' · ' + open.contact.company : ''}</p>
            <OrderItems items={open.items} />
            <OrderTotals o={open} />
            <PaymentsTable payments={open.payments} />
            {open.billing && <p className="tiny">Facturar a: {open.billing.razon} · {open.billing.rfc}</p>}
            {open.status !== 'cancelado' && open.stage < 6 && <button className="btn btn-ghost btn-danger" onClick={() => act(open, { cancel: true }, 'Pedido cancelado.')}>Cancelar pedido</button>}
          </div>
        )}
      </Modal>
    </>
  );
}

function Packages() {
  const { toast } = useStore();
  const [list, reload] = useList('/admin/packages');
  const [edit, setEdit] = useState({});
  if (!list) return <Spinner />;
  const val = (p, k) => (edit[p.id] && edit[p.id][k] != null ? edit[p.id][k] : p[k]);
  const set = (p, k, v) => setEdit({ ...edit, [p.id]: { ...(edit[p.id] || {}), [k]: v } });
  const save = async (p, extra = {}) => {
    try { await api('/admin/packages/' + p.id, { method: 'PATCH', body: { ...(edit[p.id] || {}), ...extra } }); setEdit({ ...edit, [p.id]: undefined }); toast('Paquete actualizado.'); reload(); }
    catch (e) { toast(e.message, { tone: 'danger' }); }
  };
  return (
    <div className="table-scroll">
      <table className="table admin-table">
        <thead><tr><th>Paquete</th><th>Precio base</th><th>Oferta %</th><th>Cupos/mes</th><th>Disponibles</th><th>Destacado</th><th>Activo</th><th /></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} className={p.active ? '' : 'is-muted'}>
              <td><Link to={'/producto/' + p.slug}>{p.name}</Link><br /><small className="muted">{p.category_name} · precio final {money(p.price)}</small></td>
              <td><input className="cell-input" type="number" value={val(p, 'base_price')} onChange={(e) => set(p, 'base_price', e.target.value)} aria-label="Precio base" /></td>
              <td><input className="cell-input sm" type="number" value={val(p, 'offer_pct')} onChange={(e) => set(p, 'offer_pct', e.target.value)} aria-label="Oferta" /></td>
              <td><input className="cell-input sm" type="number" value={val(p, 'slots_total')} onChange={(e) => set(p, 'slots_total', e.target.value)} aria-label="Cupos" /></td>
              <td className="mono">{p.available}</td>
              <td><input type="checkbox" checked={!!p.featured} onChange={(e) => save(p, { featured: e.target.checked })} aria-label="Destacado" /></td>
              <td><input type="checkbox" checked={!!p.active} onChange={(e) => save(p, { active: e.target.checked })} aria-label="Activo" /></td>
              <td>{edit[p.id] && <button className="btn btn-sm btn-primary" onClick={() => save(p)}>Guardar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Coupons() {
  const { toast } = useStore();
  const [list, reload] = useList('/admin/coupons');
  const [f, setF] = useState({ code: '', type: 'pct', value: 10, min_subtotal: 0, description: '' });
  const [err, setErr] = useState('');
  const create = async (e) => { e.preventDefault(); setErr(''); try { await api('/admin/coupons', { method: 'POST', body: { ...f, value: Number(f.value), min_subtotal: Number(f.min_subtotal) } }); toast('Cupón creado.'); setF({ ...f, code: '', description: '' }); reload(); } catch (x) { setErr(x.message); } };
  const toggle = async (c) => { await api('/admin/coupons/' + c.id, { method: 'PATCH', body: { active: !c.active } }); reload(); };
  if (!list) return <Spinner />;
  return (
    <div className="stack">
      <table className="table">
        <thead><tr><th>Código</th><th>Descuento</th><th>Mínimo</th><th>Descripción</th><th>Activo</th></tr></thead>
        <tbody>{list.map((c) => <tr key={c.id} className={c.active ? '' : 'is-muted'}><td className="mono">{c.code}</td><td>{c.type === 'pct' ? c.value + ' %' : money(c.value)}</td><td>{money(c.min_subtotal)}</td><td>{c.description}</td><td><input type="checkbox" checked={c.active} onChange={() => toggle(c)} aria-label={'Activar ' + c.code} /></td></tr>)}</tbody>
      </table>
      <form className="panel" onSubmit={create}>
        <h3>Nuevo cupón</h3>
        {err && <Alert tone="danger">{err}</Alert>}
        <div className="grid-4">
          <Field label="Código" id="cp-c"><input id="cp-c" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Tipo" id="cp-t"><select id="cp-t" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="pct">Porcentaje</option><option value="fixed">Monto fijo</option></select></Field>
          <Field label="Valor" id="cp-v"><input id="cp-v" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Compra mínima" id="cp-m"><input id="cp-m" type="number" value={f.min_subtotal} onChange={(e) => setF({ ...f, min_subtotal: e.target.value })} /></Field>
        </div>
        <Field label="Descripción para el cliente" id="cp-d"><input id="cp-d" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <button className="btn btn-primary">Crear cupón</button>
      </form>
    </div>
  );
}

function Reviews() {
  const { toast } = useStore();
  const [list, reload] = useList('/admin/reviews');
  const [reply, setReply] = useState({});
  if (!list) return <Spinner />;
  const save = async (r) => { await api('/admin/reviews/' + r.id, { method: 'PATCH', body: { reply: reply[r.id] ?? r.reply } }); toast('Respuesta publicada.'); reload(); };
  const del = async (r) => { await api('/admin/reviews/' + r.id, { method: 'DELETE' }); toast('Reseña eliminada.'); reload(); };
  return (
    <div className="stack">
      {list.map((r) => (
        <article key={r.id} className="panel review">
          <div className="row-between"><span><Stars value={r.rating} /> <b>{r.title}</b></span><span className="tiny muted">{r.package} · {date(r.created_at)}</span></div>
          <p>{r.body}</p>
          <p className="tiny muted">{r.author}{r.company ? ' · ' + r.company : ''}</p>
          <div className="reply-form">
            <input value={reply[r.id] ?? r.reply ?? ''} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} placeholder="Responder como DevConecta" aria-label="Respuesta" />
            <button className="btn btn-sm btn-primary" onClick={() => save(r)}>{r.reply ? 'Actualizar' : 'Responder'}</button>
            <button className="btn btn-sm btn-ghost btn-danger" onClick={() => del(r)}>Eliminar</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Messages() {
  const [list, reload] = useList('/admin/messages');
  const [subs] = useList('/admin/subscribers');
  if (!list) return <Spinner />;
  const toggle = async (m) => { await api('/admin/messages/' + m.id, { method: 'PATCH', body: { answered: !m.answered } }); reload(); };
  return (
    <div className="detail-grid">
      <section className="stack">
        <h3>Mensajes de contacto</h3>
        {!list.length && <p className="muted">Sin mensajes.</p>}
        {list.map((m) => (
          <article key={m.id} className={'panel' + (m.answered ? ' is-muted' : '')}>
            <div className="row-between"><b>{m.subject}</b><span className="tiny muted mono">T-{String(m.id).padStart(5, '0')} · {date(m.created_at, { day: 'numeric', month: 'short' })}</span></div>
            <p>{m.message}</p>
            <p className="tiny muted">{m.name} · {m.email}{m.folio ? ' · Pedido ' + m.folio : ''}</p>
            <label className="toggle-line"><input type="checkbox" checked={m.answered} onChange={() => toggle(m)} /> Respondido</label>
          </article>
        ))}
      </section>
      <section className="panel">
        <h3>Suscriptores del boletín ({subs ? subs.length : 0})</h3>
        <ul className="plain-list">{(subs || []).map((s) => <li key={s.email}><span>{s.email}</span><small className="muted">{date(s.created_at, { day: 'numeric', month: 'short' })}</small></li>)}</ul>
      </section>
    </div>
  );
}

export default function Admin() {
  const { user, ready } = useStore();
  const [tab, setTab] = useState('pedidos');
  if (!ready) return <div className="wrap page"><Spinner /></div>;
  if (!user) return <Navigate to="/entrar?volver=/admin" replace />;
  if (user.role !== 'admin') return <div className="wrap page"><Alert tone="danger">Esta sección es solo para el administrador.</Alert></div>;
  const tabs = [['pedidos', 'Pedidos'], ['paquetes', 'Paquetes'], ['cupones', 'Cupones'], ['resenas', 'Reseñas'], ['mensajes', 'Mensajes y suscriptores']];
  return (
    <div className="wrap page admin">
      <div className="row-between"><h1>Panel de administración</h1>{DEMO && <button className="btn btn-ghost btn-sm" onClick={async () => { const m = await import('../lib/mock.js'); m.resetDemo(); window.location.reload(); }}><Icon name="trash" size={16} /> Reiniciar datos de la demo</button>}</div>
      <Summary key={tab} />
      <div className="tab-list" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="tab-panel">
        {tab === 'pedidos' && <Orders />}
        {tab === 'paquetes' && <Packages />}
        {tab === 'cupones' && <Coupons />}
        {tab === 'resenas' && <Reviews />}
        {tab === 'mensajes' && <Messages />}
      </div>
      <p className="tiny muted">Tip: mueve un pedido a <b>Entrega</b> para que el cliente pueda pagar el saldo desde su cuenta. {METHOD_NAMES.spei} y OXXO se confirman con “Confirmar pago”.</p>
    </div>
  );
}
