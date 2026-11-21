import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api, qs, DEMO } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useStore } from '../state/store.jsx';
import { Icon, CAT_ICON } from './ui.jsx';
import Mockup from './Mockup.jsx';
import Chatbot from './Chatbot.jsx';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="DevConecta, ir al inicio">
      <span className="logo-mark" aria-hidden="true"><Icon name="code" size={18} /></span>
      <span className="logo-word">Dev<b>Conecta</b></span>
    </Link>
  );
}

function SearchBox({ onDone }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setRes(null); return; }
    timer.current = setTimeout(() => api('/packages/suggest' + qs({ q })).then((r) => { setRes(r); setActive(-1); }).catch(() => setRes(null)), 180);
  }, [q]);
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const options = res ? [
    ...res.packages.map((p) => ({ type: 'p', to: '/producto/' + p.slug, p })),
    ...res.categories.map((c) => ({ type: 'c', to: '/catalogo' + qs({ categoria: c.slug }), label: c.name })),
    ...res.techs.map((t) => ({ type: 't', to: '/catalogo' + qs({ tech: t }), label: t }))
  ] : [];
  const go = (to) => { setOpen(false); setQ(''); onDone && onDone(); nav(to); };
  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    if (q.trim()) go('/catalogo' + qs({ q: q.trim() }));
  };
  const onKey = (e) => {
    if (!options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % options.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
    if (e.key === 'Escape') setOpen(false);
  };
  const highlight = (text) => {
    const i = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    if (i < 0 || !q.trim()) return text;
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.trim().length)}</mark>{text.slice(i + q.trim().length)}</>;
  };
  let idx = -1;
  return (
    <form className="search" role="search" onSubmit={submit} ref={boxRef}>
      <Icon name="search" size={18} className="search-icon" />
      <input type="search" value={q} placeholder="Busca: tienda en línea, app, citas, React…" aria-label="Buscar paquetes"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        role="combobox" aria-expanded={open && !!res} aria-controls="search-list" aria-autocomplete="list" />
      {open && res && (
        <div className="search-pop" id="search-list" role="listbox">
          {!options.length && <p className="search-empty">Sin coincidencias para “{q}”. Prueba con “sitio”, “tienda” o “app”.</p>}
          {res.packages.length > 0 && <p className="search-label">Paquetes</p>}
          {res.packages.map((p) => { idx++; const i = idx; return (
            <button type="button" key={p.slug} role="option" aria-selected={active === i} className={'search-opt' + (active === i ? ' is-active' : '')} onMouseEnter={() => setActive(i)} onClick={() => go('/producto/' + p.slug)}>
              <span className="search-thumb"><Mockup kind={p.kind} seed={p.slug} /></span>
              <span className="search-txt"><span>{highlight(p.name)}</span><small>{p.category_name}</small></span>
              <span className="search-price">{money(p.price)}{p.unit ? '/' + p.unit : ''}</span>
            </button>); })}
          {res.categories.length > 0 && <p className="search-label">Categorías</p>}
          {res.categories.map((c) => { idx++; const i = idx; return (
            <button type="button" key={c.slug} role="option" aria-selected={active === i} className={'search-opt is-compact' + (active === i ? ' is-active' : '')} onMouseEnter={() => setActive(i)} onClick={() => go('/catalogo' + qs({ categoria: c.slug }))}>
              <Icon name={CAT_ICON[c.slug]} size={16} /> {highlight(c.name)}
            </button>); })}
          {res.techs.length > 0 && <p className="search-label">Tecnologías</p>}
          {res.techs.map((t) => { idx++; const i = idx; return (
            <button type="button" key={t} role="option" aria-selected={active === i} className={'search-opt is-compact' + (active === i ? ' is-active' : '')} onMouseEnter={() => setActive(i)} onClick={() => go('/catalogo' + qs({ tech: t }))}>
              <Icon name="code" size={16} /> Paquetes con {highlight(t)}
            </button>); })}
          {q.trim() && <button type="submit" className="search-all">Ver todos los resultados de “{q.trim()}” <Icon name="arrow" size={16} /></button>}
        </div>
      )}
    </form>
  );
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeLine } = useStore();
  const loc = useLocation();
  useEffect(() => { setCartOpen(false); }, [loc.pathname, setCartOpen]);
  if (!cartOpen) return null;
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  return createPortal(
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
      <aside className="drawer" aria-label="Carrito">
        <div className="drawer-head"><h2>Tu carrito</h2><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito"><Icon name="close" /></button></div>
        {!cart.length ? <p className="muted pad">Aún no agregas paquetes.</p> : (
          <ul className="drawer-list">
            {cart.map((l, i) => (
              <li key={i}>
                <span className="mini-thumb"><Mockup kind={l.kind} seed={l.slug} /></span>
                <div><b>{l.name}</b><small>{l.plan_name} · {l.tech} · {l.qty} {l.unit ? (l.qty === 1 ? l.unit : l.unit + 'es') : l.qty === 1 ? 'proyecto' : 'proyectos'}</small><span className="mono">{money(l.price * l.qty)}</span></div>
                <button className="icon-btn" onClick={() => removeLine(i)} aria-label={'Quitar ' + l.name}><Icon name="trash" size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        {cart.length > 0 && (
          <div className="drawer-foot">
            <div className="row-between"><span>Subtotal</span><b className="mono">{money(subtotal)}</b></div>
            <p className="tiny muted">IVA y entrega se calculan en el carrito. Hoy solo pagas el 50 %.</p>
            <Link to="/carrito" className="btn btn-ghost btn-block">Ver carrito</Link>
            <Link to="/pago" className="btn btn-primary btn-block">Ir a pagar</Link>
          </div>
        )}
      </aside>
    </div>, document.body
  );
}

function Toasts() {
  const { toasts, dismiss } = useStore();
  const nav = useNavigate();
  return createPortal(
    <div className="toasts" aria-live="polite">
      {toasts.slice(-3).map((t) => (
        <div key={t.id} className={'toast toast-' + t.tone}>
          <Icon name={t.tone === 'danger' ? 'alert' : t.tone === 'info' ? 'info' : 'check'} size={18} />
          <span>{t.text}</span>
          {t.action && <button onClick={() => { dismiss(t.id); t.action.to ? nav(t.action.to) : t.action.onClick(); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>, document.body
  );
}

export function Header() {
  const { user, cartCount, wish, setCartOpen, logout } = useStore();
  const [cats, setCats] = useState([]);
  const [menu, setMenu] = useState(false);
  const [acct, setAcct] = useState(false);
  const loc = useLocation();
  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => { setMenu(false); setAcct(false); }, [loc.pathname, loc.search]);
  return (
    <header className="site-header">
      <div className="topbar">
        <div className="wrap row-between">
          <span><Icon name="shield" size={14} /> Pagas 50 % para iniciar y el resto cuando apruebas tu proyecto</span>
          <span className="topbar-links"><Link to="/rastrear">Rastrear pedido</Link><Link to="/ayuda">Ayuda</Link><Link to="/contacto">Contacto</Link></span>
        </div>
      </div>
      <div className="wrap mainbar">
        <button className="icon-btn only-mobile" onClick={() => setMenu(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
        <Logo />
        <div className="only-desktop grow"><SearchBox /></div>
        <nav className="actions" aria-label="Tu cuenta">
          <div className="acct">
            <button className="action" onClick={() => setAcct((a) => !a)} aria-expanded={acct} aria-haspopup="true">
              <Icon name="user" /><span className="only-desktop">{user ? user.name.split(' ')[0] : 'Entrar'}</span>
            </button>
            {acct && (
              <div className="pop" role="menu">
                {user ? (<>
                  <p className="pop-head">Hola, {user.name.split(' ')[0]}</p>
                  <Link to="/cuenta" role="menuitem">Mi cuenta</Link>
                  <Link to="/cuenta/pedidos" role="menuitem">Mis pedidos</Link>
                  <Link to="/cuenta/deseos" role="menuitem">Lista de deseos</Link>
                  {user.role === 'admin' && <Link to="/admin" role="menuitem">Panel de administración</Link>}
                  <button role="menuitem" onClick={logout}><Icon name="logout" size={16} /> Cerrar sesión</button>
                </>) : (<>
                  <p className="pop-head">Guarda tu carrito y sigue tus proyectos</p>
                  <Link to="/entrar" className="btn btn-primary btn-block">Iniciar sesión</Link>
                  <Link to="/registro" className="btn btn-ghost btn-block">Crear cuenta</Link>
                </>)}
              </div>
            )}
          </div>
          <Link to={user ? '/cuenta/deseos' : '/entrar'} className="action" aria-label={`Lista de deseos (${wish.length})`}>
            <Icon name="heart" />{wish.length > 0 && <span className="count">{wish.length}</span>}
          </Link>
          <button className="action" onClick={() => setCartOpen(true)} aria-label={`Carrito (${cartCount})`}>
            <Icon name="cart" />{cartCount > 0 && <span className="count count-accent">{cartCount}</span>}
          </button>
        </nav>
      </div>
      <div className="only-mobile wrap mobile-search"><SearchBox /></div>
      <nav className="catbar only-desktop" aria-label="Categorías">
        <div className="wrap">
          <NavLink to="/catalogo" end className="catlink">Todos</NavLink>
          {cats.map((c) => (
            <div className="catitem" key={c.slug}>
              <Link to={'/catalogo' + qs({ categoria: c.slug })} className={'catlink' + (new URLSearchParams(loc.search).get('categoria') === c.slug ? ' active' : '')}>
                <Icon name={CAT_ICON[c.slug]} size={16} />{c.name}<Icon name="down" size={14} />
              </Link>
              <div className="catmenu">
                <p className="tiny muted">{c.description}</p>
                {c.subcategories.map((s) => <Link key={s.slug} to={'/catalogo' + qs({ categoria: c.slug, sub: s.slug })}>{s.name}</Link>)}
                <Link className="catmenu-all" to={'/catalogo' + qs({ categoria: c.slug })}>Ver {c.count} paquetes <Icon name="arrow" size={14} /></Link>
              </div>
            </div>
          ))}
          <Link to="/catalogo?orden=oferta" className="catlink catlink-offer">Ofertas</Link>
        </div>
      </nav>
      {menu && createPortal(
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
          <aside className="drawer drawer-left" aria-label="Menú">
            <div className="drawer-head"><Logo /><button className="icon-btn" onClick={() => setMenu(false)} aria-label="Cerrar menú"><Icon name="close" /></button></div>
            <nav className="mobile-nav">
              <Link to="/catalogo">Todos los paquetes</Link>
              {cats.map((c) => (
                <details key={c.slug}><summary><Icon name={CAT_ICON[c.slug]} size={18} />{c.name}</summary>
                  <Link to={'/catalogo' + qs({ categoria: c.slug })}>Ver todo</Link>
                  {c.subcategories.map((s) => <Link key={s.slug} to={'/catalogo' + qs({ categoria: c.slug, sub: s.slug })}>{s.name}</Link>)}
                </details>
              ))}
              <Link to="/catalogo?orden=oferta">Ofertas</Link>
              <hr />
              <Link to={user ? '/cuenta' : '/entrar'}>{user ? 'Mi cuenta' : 'Iniciar sesión'}</Link>
              <Link to="/rastrear">Rastrear pedido</Link>
              <Link to="/ayuda">Centro de ayuda</Link>
              <Link to="/contacto">Contacto</Link>
            </nav>
          </aside>
        </div>, document.body
      )}
      <CartDrawer />
      <Toasts />
    </header>
  );
}

export function Newsletter({ compact }) {
  const { toast } = useStore();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setState('saving'); setError('');
    try {
      const r = await api('/newsletter', { method: 'POST', body: { email } });
      setState('done');
      toast(r.already ? 'Ese correo ya estaba suscrito.' : 'Listo. Te enviaremos una guía al mes, sin spam.');
      setEmail('');
    } catch (err) { setState('idle'); setError(err.message); }
  };
  return (
    <form className={'newsletter' + (compact ? ' is-compact' : '')} onSubmit={submit} noValidate>
      <label htmlFor={compact ? 'nl-f' : 'nl-h'} className="sr-only">Correo electrónico</label>
      <div className="newsletter-row">
        <input id={compact ? 'nl-f' : 'nl-h'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required aria-invalid={!!error} />
        <button className="btn btn-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Suscribiendo…' : 'Suscribirme'}</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="tiny muted">Puedes darte de baja en cualquier correo. Lee el <Link to="/politicas/privacidad">aviso de privacidad</Link>.</p>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <Logo />
          <p className="muted">Paquetes de software con precio y fecha de entrega para pymes de Tabasco y todo México.</p>
          <p className="tiny muted"><Icon name="pin" size={14} /> Cunduacán, Tabasco · <Icon name="mail" size={14} /> hola@devconecta.mx</p>
        </div>
        <div>
          <h3>Comprar</h3>
          <Link to="/catalogo">Catálogo</Link><Link to="/catalogo?orden=oferta">Ofertas</Link><Link to="/carrito">Carrito</Link><Link to="/rastrear">Rastrear pedido</Link>
        </div>
        <div>
          <h3>Ayuda</h3>
          <Link to="/ayuda">Preguntas frecuentes</Link><Link to="/contacto">Contacto</Link><Link to="/nosotros">Quiénes somos</Link>
        </div>
        <div>
          <h3>Políticas</h3>
          <Link to="/politicas/devoluciones">Cancelación y devoluciones</Link><Link to="/politicas/entregas">Entregas</Link><Link to="/politicas/privacidad">Aviso de privacidad</Link><Link to="/politicas/terminos">Términos y condiciones</Link>
        </div>
        <div className="footer-news">
          <h3>Guía mensual para vender en línea</h3>
          <Newsletter compact />
        </div>
      </div>
      <div className="wrap footer-base">
        <span>© 2026 DevConecta · Proyecto académico de Comercio Electrónico, UJAT.</span>
        <span className="pay-logos" aria-label="Métodos de pago aceptados">Visa · Mastercard · Mercado Pago · PayPal · SPEI · OXXO</span>
        {DEMO && <span className="badge badge-warn">Demo: los datos se guardan solo en este navegador</span>}
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <button className="skip" onClick={() => { const m = document.getElementById('main'); m && m.focus(); }}>Saltar al contenido</button>
      <Header />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer />
      <Chatbot />
    </>
  );
}
