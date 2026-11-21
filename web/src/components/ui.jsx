import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../lib/format.js';

const P = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3',
  cart: 'M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.4-1.1L21 8H6.2M10 20.5h.01M17 20.5h.01',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  down: 'm6 9 6 6 6-6',
  right: 'm9 6 6 6-6 6',
  left: 'm15 6-6 6 6 6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  shield: 'M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3zm-3 9 2 2 4-4',
  chat: 'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-3 2.5z',
  send: 'M4 12 20 4l-6 16-2.5-6.5L4 12z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  zoom: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3M11 8v6M8 11h6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z',
  bag: 'M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 0 1 6 0v2',
  phone: 'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3zm3 15h2',
  cloud: 'M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  mail: 'M4 6h16v12H4zm0 0 8 7 8-7',
  box: 'M4 8 12 4l8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-9h.01',
  alert: 'M12 4 2.8 19.5h18.4L12 4zm0 6v4m0 3h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  pin: 'M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zm4 4h4',
  code: 'm8 8-4 4 4 4m8-8 4 4-4 4M13.5 6l-3 12',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  layers: 'm12 4 8 4-8 4-8-4 8-4zm-8 8 8 4 8-4M4 16l8 4 8-4',
  admin: 'M4 5h16v10H4zM9 19h6M12 15v4'
};
export function Icon({ name, size = 20, fill = false, className = '', title }) {
  return (
    <svg className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={P[name] || P.info} />
    </svg>
  );
}

export function Stars({ value = 0, size = 14, count }) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="stars" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <defs><linearGradient id={`h${i}${size}`}><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="var(--line-2)" /></linearGradient></defs>
          <path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.8 6.6 19.7l1.2-5.9L3.4 9.7l6-.7z"
            fill={i <= full ? 'currentColor' : i - 0.5 === full ? `url(#h${i}${size})` : 'var(--line-2)'} />
        </svg>
      ))}
      {count != null && <span className="stars-count">({count})</span>}
    </span>
  );
}

export function Price({ price, list, unit, size = 'md', from }) {
  return (
    <span className={'price price-' + size}>
      {from && <span className="price-from">desde</span>}
      <span className="price-now">{money(price)}</span>
      {unit && <span className="price-unit">/{unit}</span>}
      {list > price && <s className="price-list">{money(list)}</s>}
    </span>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}

export function Spinner({ label = 'Cargando' }) {
  return <div className="spinner" role="status"><span className="spinner-dot" /><span className="sr-only">{label}</span></div>;
}

export function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function Empty({ icon = 'box', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children, id, optional }) {
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      {label && <label htmlFor={id}>{label}{optional && <span className="optional"> (opcional)</span>}</label>}
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Qty({ value, onChange, min = 1, max = 24, label = 'Cantidad' }) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Quitar uno"><Icon name="minus" size={16} /></button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} aria-label={label}
        onChange={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Agregar uno"><Icon name="plus" size={16} /></button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current && ref.current.focus(), 10);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev && prev.focus && prev.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Crumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Ruta de navegación">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <Icon name="right" size={14} />}
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Alert({ tone = 'info', children, icon }) {
  return <div className={'alert alert-' + tone} role={tone === 'danger' ? 'alert' : undefined}><Icon name={icon || (tone === 'danger' || tone === 'warn' ? 'alert' : 'info')} size={18} /><div>{children}</div></div>;
}

export const CAT_ICON = { 'sitios-web': 'globe', 'tiendas-en-linea': 'bag', sistemas: 'grid', 'apps-moviles': 'phone', 'soporte-nube': 'cloud' };
