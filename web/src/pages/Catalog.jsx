import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { money, plural } from '../lib/format.js';
import { storage } from '../lib/storage.js';
import { Icon, Crumbs, Empty, Skeleton, CAT_ICON } from '../components/ui.jsx';
import PackageCard from '../components/PackageCard.jsx';

const SORTS = [['popular', 'Más vendidos'], ['precio-asc', 'Precio: menor a mayor'], ['precio-desc', 'Precio: mayor a menor'], ['nuevo', 'Más nuevos'], ['calificacion', 'Mejor calificados'], ['oferta', 'Solo ofertas']];
const PRICE_PRESETS = [[0, 10000, 'Hasta $10,000'], [10000, 30000, '$10,000 a $30,000'], [30000, 60000, '$30,000 a $60,000'], [60000, null, 'Más de $60,000']];

function Filters({ params, set, facets, cats, onClose }) {
  const cat = params.get('categoria');
  const sub = params.get('sub');
  const techs = (params.get('tech') || '').split(',').filter(Boolean);
  const feats = (params.get('feat') || '').split(',').filter(Boolean);
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');
  useEffect(() => { setMin(params.get('min') || ''); setMax(params.get('max') || ''); }, [params]);
  const toggle = (key, list, v) => set({ [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });

  return (
    <div className="filters">
      {onClose && <div className="drawer-head"><h2>Filtros</h2><button className="icon-btn" onClick={onClose} aria-label="Cerrar filtros"><Icon name="close" /></button></div>}
      <section>
        <h3>Categorías</h3>
        <ul className="cat-tree">
          <li><button className={!cat ? 'is-on' : ''} onClick={() => set({ categoria: null, sub: null })}>Todas</button></li>
          {cats.map((c) => (
            <li key={c.slug}>
              <button className={cat === c.slug && !sub ? 'is-on' : ''} onClick={() => set({ categoria: c.slug, sub: null })}><Icon name={CAT_ICON[c.slug]} size={16} />{c.name}<span className="muted mono">{c.count}</span></button>
              {cat === c.slug && (
                <ul>{c.subcategories.map((s) => <li key={s.slug}><button className={sub === s.slug ? 'is-on' : ''} onClick={() => set({ categoria: c.slug, sub: s.slug })}>{s.name}</button></li>)}</ul>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Precio</h3>
        <ul className="radio-list">
          {PRICE_PRESETS.map(([a, b, label]) => {
            const on = String(params.get('min') || '') === String(a || '') && String(params.get('max') || '') === String(b || '');
            return <li key={label}><label><input type="radio" name="price" checked={on} onChange={() => set({ min: a || null, max: b })} />{label}</label></li>;
          })}
        </ul>
        <form className="price-range" onSubmit={(e) => { e.preventDefault(); set({ min: min || null, max: max || null }); }}>
          <input type="number" inputMode="numeric" placeholder={facets ? String(facets.price.min) : 'Mín.'} value={min} onChange={(e) => setMin(e.target.value)} aria-label="Precio mínimo" />
          <span>a</span>
          <input type="number" inputMode="numeric" placeholder={facets ? String(facets.price.max) : 'Máx.'} value={max} onChange={(e) => setMax(e.target.value)} aria-label="Precio máximo" />
          <button className="btn btn-ghost btn-sm" aria-label="Aplicar rango de precio"><Icon name="right" size={16} /></button>
        </form>
      </section>
      {facets && facets.techs.length > 0 && (
        <section>
          <h3>Tecnología</h3>
          <ul className="check-list">
            {facets.techs.map((t) => <li key={t.name}><label><input type="checkbox" checked={techs.includes(t.name)} onChange={() => toggle('tech', techs, t.name)} />{t.name}<span className="muted mono">{t.count}</span></label></li>)}
          </ul>
        </section>
      )}
      {facets && facets.features.length > 0 && (
        <section>
          <h3>Características</h3>
          <ul className="check-list">
            {facets.features.map((t) => <li key={t.name}><label><input type="checkbox" checked={feats.includes(t.name)} onChange={() => toggle('feat', feats, t.name)} />{t.name}<span className="muted mono">{t.count}</span></label></li>)}
          </ul>
        </section>
      )}
      <section>
        <h3>Calificación</h3>
        <label className="toggle-line"><input type="checkbox" checked={params.get('rating') === '4.5'} onChange={(e) => set({ rating: e.target.checked ? '4.5' : null })} /> 4.5 estrellas o más</label>
      </section>
      {onClose && <button className="btn btn-primary btn-block" onClick={onClose}>Ver resultados</button>}
    </div>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [view, setView] = useState(() => storage.get('dc_view', 'grid'));

  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  const key = params.toString();
  useEffect(() => {
    setLoading(true); setError('');
    api('/packages' + (key ? '?' + key : '')).then(setRes).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [key]);

  const set = (patch) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v == null || v === '' || (Array.isArray(v) && !v.length)) p.delete(k); else p.set(k, Array.isArray(v) ? v.join(',') : v); });
    if (!('page' in patch)) p.delete('page');
    setParams(p);
  };
  const changeView = (v) => { setView(v); storage.set('dc_view', v); };

  const cat = cats.find((c) => c.slug === params.get('categoria'));
  const sub = cat && cat.subcategories.find((s) => s.slug === params.get('sub'));
  const q = params.get('q');
  const title = q ? `Resultados para “${q}”` : sub ? sub.name : cat ? cat.name : params.get('orden') === 'oferta' ? 'Ofertas' : 'Todos los paquetes';

  const chips = useMemo(() => {
    const out = [];
    if (q) out.push({ label: `“${q}”`, clear: { q: null } });
    if (cat) out.push({ label: cat.name, clear: { categoria: null, sub: null } });
    if (sub) out.push({ label: sub.name, clear: { sub: null } });
    const min = params.get('min'); const max = params.get('max');
    if (min || max) out.push({ label: min && max ? `${money(+min)} a ${money(+max)}` : min ? `Desde ${money(+min)}` : `Hasta ${money(+max)}`, clear: { min: null, max: null } });
    (params.get('tech') || '').split(',').filter(Boolean).forEach((t, _i, arr) => out.push({ label: t, clear: { tech: arr.filter((x) => x !== t) } }));
    (params.get('feat') || '').split(',').filter(Boolean).forEach((t, _i, arr) => out.push({ label: t, clear: { feat: arr.filter((x) => x !== t) } }));
    if (params.get('rating')) out.push({ label: '4.5★ o más', clear: { rating: null } });
    return out;
  }, [params, cat, sub, q]);

  const sorts = q ? [['relevancia', 'Más relevantes'], ...SORTS] : SORTS;
  const currentSort = res ? res.orden : params.get('orden') || (q ? 'relevancia' : 'popular');

  return (
    <div className="wrap page catalog">
      <Crumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Catálogo', to: cat ? '/catalogo' : undefined }, ...(cat ? [{ label: cat.name, to: sub ? '/catalogo' + qs({ categoria: cat.slug }) : undefined }] : []), ...(sub ? [{ label: sub.name }] : [])]} />
      <div className="catalog-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{cat && !q ? cat.description + ' ' : ''}{res ? plural(res.total, 'paquete', 'paquetes') : 'Buscando…'}</p>
        </div>
      </div>
      <div className="catalog-grid">
        <aside className="only-desktop"><Filters params={params} set={set} facets={res && res.facets} cats={cats} /></aside>
        <div>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm only-mobile" onClick={() => setMobileFilters(true)}><Icon name="filter" size={16} /> Filtros{chips.length ? ` (${chips.length})` : ''}</button>
            <div className="chips-active">
              {chips.map((c) => <button key={c.label} className="chip-x" onClick={() => set(c.clear)} aria-label={'Quitar filtro ' + c.label}>{c.label}<Icon name="close" size={14} /></button>)}
              {chips.length > 1 && <button className="link" onClick={() => setParams(new URLSearchParams())}>Limpiar todo</button>}
            </div>
            <label className="sort">
              <span className="only-desktop muted">Ordenar por</span>
              <select value={currentSort} onChange={(e) => set({ orden: e.target.value })} aria-label="Ordenar por">
                {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="seg" role="group" aria-label="Vista">
              <button className={view === 'grid' ? 'is-on' : ''} onClick={() => changeView('grid')} aria-label="Vista en cuadrícula" aria-pressed={view === 'grid'}><Icon name="grid" size={18} /></button>
              <button className={view === 'list' ? 'is-on' : ''} onClick={() => changeView('list')} aria-label="Vista en lista" aria-pressed={view === 'list'}><Icon name="list" size={18} /></button>
            </div>
          </div>

          {error && <Empty icon="alert" title="No pudimos cargar el catálogo">{error}</Empty>}
          {!error && loading && !res && <div className={view === 'grid' ? 'grid-cards' : 'list-cards'}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className={'pcard pcard-' + view}><Skeleton h={170} /><div className="pcard-body"><Skeleton h={16} w="70%" /><Skeleton h={12} w="40%" /></div></div>)}</div>}
          {!error && res && !res.items.length && (
            <Empty icon="search" title="Ningún paquete coincide con estos filtros" action={<button className="btn btn-primary" onClick={() => setParams(new URLSearchParams(q ? { q } : {}))}>Quitar filtros</button>}>
              Quita algún filtro o busca con otras palabras, por ejemplo “tienda”, “app” o “citas”. ¿No ves lo que necesitas? <Link to="/contacto">Pide una cotización a la medida</Link>.
            </Empty>
          )}
          {res && res.items.length > 0 && (
            <div className={(view === 'grid' ? 'grid-cards' : 'list-cards') + (loading ? ' is-loading' : '')}>
              {res.items.map((p) => <PackageCard key={p.slug} p={p} layout={view} />)}
            </div>
          )}
          {res && res.pages > 1 && (
            <nav className="pager" aria-label="Páginas">
              <button disabled={res.page <= 1} onClick={() => set({ page: res.page - 1 })} aria-label="Página anterior"><Icon name="left" size={16} /></button>
              {Array.from({ length: res.pages }).map((_, i) => <button key={i} className={res.page === i + 1 ? 'is-on' : ''} aria-current={res.page === i + 1 ? 'page' : undefined} onClick={() => set({ page: i + 1 })}>{i + 1}</button>)}
              <button disabled={res.page >= res.pages} onClick={() => set({ page: res.page + 1 })} aria-label="Página siguiente"><Icon name="right" size={16} /></button>
            </nav>
          )}
        </div>
      </div>
      {mobileFilters && (
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMobileFilters(false)}>
          <aside className="drawer drawer-left" aria-label="Filtros"><Filters params={params} set={set} facets={res && res.facets} cats={cats} onClose={() => setMobileFilters(false)} /></aside>
        </div>
      )}
    </div>
  );
}
