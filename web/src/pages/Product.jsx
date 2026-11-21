import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { money, date, plural } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, Stars, Crumbs, Qty, Modal, Field, Empty, Skeleton, Badge, Alert } from '../components/ui.jsx';
import Mockup, { galleryViews } from '../components/Mockup.jsx';
import PackageCard, { stockLabel } from '../components/PackageCard.jsx';

function Gallery({ p }) {
  const views = galleryViews(p.kind);
  const [cur, setCur] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [light, setLight] = useState(false);
  const [lightZoom, setLightZoom] = useState(false);
  const ref = useRef(null);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const v = views[cur];
  return (
    <div className="gallery">
      <div className="gallery-main" ref={ref} onMouseMove={move} onMouseLeave={() => setZoom(null)} onClick={() => setLight(true)}
        role="button" tabIndex={0} aria-label="Ampliar imagen" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLight(true)}>
        <div className="gallery-zoom" style={zoom ? { transform: 'scale(2.1)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
          <Mockup kind={p.kind} seed={p.slug} view={v.id} title={`${p.name}: ${v.label}`} />
        </div>
        <span className="gallery-hint"><Icon name="zoom" size={16} /> Pasa el cursor para ampliar · clic para pantalla completa</span>
      </div>
      <div className="thumbs" role="tablist" aria-label="Imágenes">
        {views.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === cur} className={i === cur ? 'is-on' : ''} onClick={() => setCur(i)}>
            <Mockup kind={p.kind} seed={p.slug} view={x.id} /><span>{x.label}</span>
          </button>
        ))}
      </div>
      <Modal open={light} onClose={() => { setLight(false); setLightZoom(false); }} title={`${p.name} · ${v.label}`} wide>
        <div className={'lightbox' + (lightZoom ? ' is-zoomed' : '')} onClick={() => setLightZoom((z) => !z)}>
          <Mockup kind={p.kind} seed={p.slug} view={v.id} />
        </div>
        <div className="lightbox-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setCur((cur - 1 + views.length) % views.length)}><Icon name="left" size={16} /> Anterior</button>
          <span className="muted tiny">{cur + 1} de {views.length} · clic en la imagen para {lightZoom ? 'alejar' : 'acercar'}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setCur((cur + 1) % views.length)}>Siguiente <Icon name="right" size={16} /></button>
        </div>
      </Modal>
    </div>
  );
}

function Reviews({ p }) {
  const { user, toast } = useStore();
  const [data, setData] = useState(null);
  const [orden, setOrden] = useState('recientes');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: '', body: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api(`/packages/${p.slug}/reviews` + qs({ orden })).then(setData).catch(() => setData({ summary: { avg: 0, count: 0, dist: [] }, items: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [p.slug, orden]);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try { await api(`/packages/${p.slug}/reviews`, { method: 'POST', body: form }); setOpen(false); setForm({ rating: 0, title: '', body: '' }); toast('Gracias. Tu reseña ya está publicada.'); load(); }
    catch (x) { setErr(x.message); } finally { setSaving(false); }
  };
  if (!data) return <Skeleton h={120} />;
  const s = data.summary;
  return (
    <div className="reviews">
      <div className="reviews-summary">
        <p className="reviews-avg mono">{s.count ? s.avg.toFixed(1) : '—'}</p>
        <Stars value={s.avg} size={18} />
        <p className="muted">{plural(s.count, 'reseña', 'reseñas')}</p>
        <ul className="dist">
          {s.dist.map((d) => <li key={d.rating}><span className="mono">{d.rating}★</span><span className="bar"><span style={{ width: s.count ? `${(d.count / s.count) * 100}%` : 0 }} /></span><span className="mono muted">{d.count}</span></li>)}
        </ul>
        {user ? <button className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>Escribir una reseña</button>
          : <p className="tiny muted"><Link to="/entrar">Inicia sesión</Link> para escribir una reseña.</p>}
      </div>
      <div className="reviews-list">
        <div className="row-between">
          <h3>Opiniones de clientes</h3>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar reseñas"><option value="recientes">Más recientes</option><option value="mejores">Mejor calificadas</option><option value="peores">Peor calificadas</option></select>
        </div>
        {!data.items.length && <Empty icon="chat" title="Este paquete aún no tiene reseñas">Si ya lo contrataste, cuéntales a otras pymes cómo te fue.</Empty>}
        {data.items.map((r) => (
          <article key={r.id} className="review">
            <div className="row-between"><Stars value={r.rating} /><span className="tiny muted">{date(r.created_at)}</span></div>
            <h4>{r.title}</h4>
            <p>{r.body}</p>
            <p className="tiny muted"><b>{r.author}</b>{r.company ? ` · ${r.company}` : ''}{r.verified && <span className="verified"><Icon name="check" size={12} /> Compra verificada</span>}</p>
            {r.reply && <div className="reply"><b>Respuesta de DevConecta</b><p>{r.reply}</p></div>}
          </article>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={'Reseña de ' + p.name}>
        <form onSubmit={submit} className="stack">
          <fieldset className="rate-input"><legend>Tu calificación</legend>
            {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={n <= form.rating ? 'is-on' : ''} onClick={() => setForm({ ...form, rating: n })} aria-label={plural(n, 'estrella', 'estrellas')} aria-pressed={n <= form.rating}>★</button>)}
          </fieldset>
          <Field label="Título" id="rv-t"><input id="rv-t" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resume tu experiencia" /></Field>
          <Field label="Tu opinión" id="rv-b"><textarea id="rv-b" rows={4} value={form.body} maxLength={1500} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="¿Qué te gustó? ¿Qué mejorarías?" /></Field>
          {err && <Alert tone="danger">{err}</Alert>}
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Publicando…' : 'Publicar reseña'}</button>
        </form>
      </Modal>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const { addToCart, setCartOpen, wish, toggleWish, toast } = useStore();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState('basico');
  const [tech, setTech] = useState('');
  const [qty, setQty] = useState(1);
  const [eta, setEta] = useState(null);
  const [tab, setTab] = useState('desc');

  useEffect(() => {
    setP(null); setError(''); setTab('desc');
    api('/packages/' + slug).then((d) => { setP(d); setPlan(d.plans[Math.min(1, d.plans.length - 1)].id); setTech(d.techs[0]); setQty(1); }).catch((e) => setError(e.message));
  }, [slug]);
  useEffect(() => {
    if (!p) return;
    api('/cart/quote', { method: 'POST', body: { items: [{ slug: p.slug, plan, qty }] } }).then((r) => setEta(r.options)).catch(() => setEta(null));
  }, [p, plan, qty]);

  if (error) return <div className="wrap page"><Empty icon="search" title="No encontramos ese paquete" action={<Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>}>{error}</Empty></div>;
  if (!p) return <div className="wrap page product-grid"><Skeleton h={420} r={12} /><div className="stack"><Skeleton h={28} w="80%" /><Skeleton h={16} w="40%" /><Skeleton h={120} /><Skeleton h={48} /></div></div>;

  const sel = p.plans.find((x) => x.id === plan) || p.plans[0];
  const st = stockLabel(p);
  const maxQty = p.unit ? 24 : Math.max(1, p.available);
  const saved = wish.includes(p.slug);
  const unitWord = p.unit ? (qty === 1 ? p.unit : p.unit + 'es') : qty === 1 ? 'proyecto' : 'proyectos';
  const add = () => {
    addToCart({ slug: p.slug, name: p.name, kind: p.kind, unit: p.unit, plan: sel.id, plan_name: sel.name, tech, qty, price: sel.price });
    toast(`${p.name} (${sel.name}) se agregó al carrito.`, { action: { label: 'Ver carrito', onClick: () => setCartOpen(true) } });
  };

  return (
    <div className="wrap page">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: p.category_obj.name, to: '/catalogo' + qs({ categoria: p.category }) }, ...(p.sub ? [{ label: p.sub_name, to: '/catalogo' + qs({ categoria: p.category, sub: p.sub }) }] : []), { label: p.name }]} />
      <div className="product-grid">
        <Gallery p={p} />
        <div className="buybox">
          <p className="eyebrow">{p.sub_name || p.category_name}</p>
          <h1>{p.name}</h1>
          <div className="buybox-rating">
            {p.reviews_count ? <button className="link" onClick={() => { setTab('reviews'); document.getElementById('tabs').scrollIntoView({ behavior: 'smooth' }); }}><Stars value={p.rating} /> {p.rating} · {plural(p.reviews_count, 'reseña', 'reseñas')}</button> : <span className="muted tiny">Sin reseñas aún</span>}
            <span className="muted tiny">· {p.sold} vendidos</span>
          </div>
          <p className="lead">{p.short}</p>

          <div className="buy-price">
            <span className="price price-lg"><span className="price-now">{money(sel.price)}</span>{p.unit && <span className="price-unit">/{p.unit}</span>}{sel.list > sel.price && <s className="price-list">{money(sel.list)}</s>}</span>
            {p.offer_pct > 0 && <Badge tone="accent">Ahorras {money(sel.list - sel.price)}</Badge>}
            <p className="tiny muted">Más IVA. Hoy pagas el 50 %: <b className="mono">{money(sel.price * qty * 0.5 * 1.16, { decimals: 2 })}</b> con IVA.</p>
          </div>

          <fieldset className="opt">
            <legend>Plan</legend>
            <div className="plans">
              {p.plans.map((pl) => (
                <label key={pl.id} className={'plan' + (pl.id === plan ? ' is-on' : '')}>
                  <input type="radio" name="plan" value={pl.id} checked={pl.id === plan} onChange={() => setPlan(pl.id)} />
                  <span className="plan-name">{pl.name}</span>
                  <span className="mono">{money(pl.price)}</span>
                  <span className="tiny muted">{p.unit ? 'por ' + p.unit : plural(pl.weeks, 'semana', 'semanas')}</span>
                </label>
              ))}
            </div>
            <ul className="plan-feats">{sel.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>
          </fieldset>

          <fieldset className="opt">
            <legend>Tecnología</legend>
            <div className="chip-select">
              {p.techs.map((t) => <button type="button" key={t} className={t === tech ? 'is-on' : ''} aria-pressed={t === tech} onClick={() => setTech(t)}>{t}</button>)}
            </div>
            <p className="tiny muted">¿No sabes cuál elegir? Lo definimos contigo en la etapa de análisis sin costo.</p>
          </fieldset>

          <div className="opt opt-row">
            <div><p className="opt-label">{p.unit ? 'Meses' : 'Cantidad'}</p><Qty value={qty} onChange={setQty} max={maxQty} label={p.unit ? 'Meses' : 'Cantidad de proyectos'} /></div>
            <div className="avail">
              <span className={'stock stock-' + st.tone}><Icon name={st.tone === 'danger' ? 'alert' : 'check'} size={16} />{st.text}</span>
              {eta && eta[0] && <span className="tiny"><Icon name="clock" size={14} /> Entrega estimada: <b>{date(eta[0].eta, { day: 'numeric', month: 'long' })}</b> (o {date(eta[1].eta, { day: 'numeric', month: 'long' })} prioritaria)</span>}
            </div>
          </div>

          <div className="buy-actions">
            <button className="btn btn-primary btn-lg" onClick={add} disabled={p.available <= 0}><Icon name="cart" size={18} /> {p.available <= 0 ? 'Sin cupo este mes' : `Agregar ${qty} ${unitWord} al carrito`}</button>
            <button className={'btn btn-ghost btn-lg btn-icon' + (saved ? ' is-saved' : '')} onClick={() => toggleWish(p.slug, p.name)} aria-pressed={saved} aria-label={saved ? 'Quitar de la lista de deseos' : 'Guardar en la lista de deseos'}><Icon name="heart" fill={saved} /></button>
          </div>
          {p.available <= 0 && <Alert tone="warn">Ya iniciamos todos los proyectos de este tipo que podemos atender este mes. <Link to="/contacto">Escríbenos</Link> para apartar lugar el próximo mes.</Alert>}

          <ul className="mini-trust">
            <li><Icon name="shield" size={16} /> Pago protegido con 3-D Secure</li>
            <li><Icon name="clock" size={16} /> Cancelación sin costo en 5 días hábiles</li>
            <li><Icon name="code" size={16} /> El código fuente es tuyo</li>
          </ul>
        </div>
      </div>

      <section className="tabs" id="tabs">
        <div className="tab-list" role="tablist">
          {[['desc', 'Descripción'], ['specs', 'Especificaciones'], ['reviews', `Reseñas (${p.reviews_count})`]].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
        <div className="tab-panel" role="tabpanel">
          {tab === 'desc' && (
            <div className="desc">
              <p>{p.description}</p>
              <h3>Incluye</h3>
              <ul className="check-grid">{p.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>
              <h3>Cómo lo trabajamos</h3>
              <p className="muted">Análisis de requerimientos → diseño para tu aprobación → desarrollo → pruebas → entrega. Ves cada etapa en Mi cuenta y pagas el saldo solo al aprobar.</p>
            </div>
          )}
          {tab === 'specs' && (
            <div className="specs">
              <table className="table spec-table"><tbody>
                {p.specs.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
                <tr><th scope="row">Tecnologías</th><td>{p.techs.join(', ')}</td></tr>
              </tbody></table>
              <h3>Comparación de planes</h3>
              <div className="table-scroll">
                <table className="table compare">
                  <thead><tr><th />{p.plans.map((pl) => <th key={pl.id}>{pl.name}</th>)}</tr></thead>
                  <tbody>
                    <tr><th scope="row">Precio</th>{p.plans.map((pl) => <td key={pl.id} className="mono">{money(pl.price)}{p.unit ? '/' + p.unit : ''}</td>)}</tr>
                    {!p.unit && <tr><th scope="row">Plazo</th>{p.plans.map((pl) => <td key={pl.id}>{plural(pl.weeks, 'semana', 'semanas')}</td>)}</tr>}
                    <tr><th scope="row">Incluye</th>{p.plans.map((pl) => <td key={pl.id}><ul>{pl.features.map((f) => <li key={f}>{f}</li>)}</ul></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === 'reviews' && <Reviews p={p} />}
        </div>
      </section>

      {p.related.length > 0 && (
        <section className="section">
          <div className="section-head"><div><p className="eyebrow">También te puede servir</p><h2>Paquetes relacionados</h2></div></div>
          <div className="grid-cards">{p.related.map((r) => <PackageCard key={r.slug} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
