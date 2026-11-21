import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { money } from '../lib/format.js';
import { Icon, Stars, Skeleton, CAT_ICON } from '../components/ui.jsx';
import PackageCard from '../components/PackageCard.jsx';
import Mockup from '../components/Mockup.jsx';
import { Newsletter } from '../components/Layout.jsx';

const BENCH = [
  { tab: 'Landing', slug: 'landing-page-profesional', kind: 'landing', weeks: '1–3', stack: 'React · Astro · WordPress' },
  { tab: 'Tienda', slug: 'tienda-en-linea-completa', kind: 'store', weeks: '4–9', stack: 'React · Node.js · PostgreSQL' },
  { tab: 'Sistema', slug: 'agenda-de-citas', kind: 'agenda', weeks: '3–7', stack: 'React · Node.js · PostgreSQL' },
  { tab: 'App', slug: 'app-multiplataforma', kind: 'crossplatform', weeks: '8–16', stack: 'Flutter · Firebase' }
];

function Bench({ cards }) {
  const [i, setI] = useState(1);
  const b = BENCH[i];
  const card = cards.find((c) => c.slug === b.slug);
  return (
    <div className="bench">
      <div className="bench-tabs" role="tablist" aria-label="Tipo de proyecto">
        {BENCH.map((x, k) => (
          <button key={x.tab} role="tab" aria-selected={k === i} className={k === i ? 'is-on' : ''} onClick={() => setI(k)}>{x.tab}</button>
        ))}
      </div>
      <div className="bench-stage" role="tabpanel">
        <Mockup key={b.kind} kind={b.kind} seed={b.slug} view={b.kind === 'crossplatform' ? 'm0' : 'd'} className="bench-mock" />
      </div>
      <dl className="spec">
        <div><dt>paquete</dt><dd>{card ? card.name : '—'}</dd></div>
        <div><dt>desde</dt><dd>{card ? money(card.price) : '—'}{card && card.list > card.price && <s> {money(card.list)}</s>}</dd></div>
        <div><dt>plazo</dt><dd>{b.weeks} semanas</dd></div>
        <div><dt>stack</dt><dd>{b.stack}</dd></div>
      </dl>
      <Link to={'/producto/' + b.slug} className="bench-link">Ver este paquete <Icon name="arrow" size={16} /></Link>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [all, setAll] = useState([]);
  useEffect(() => {
    api('/home').then(setData).catch(() => setData({ featured: [], offers: [], categories: [], testimonials: [], stats: {} }));
    api('/packages?limit=48').then((r) => setAll(r.items)).catch(() => {});
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Software para pymes · Tabasco y todo México</p>
            <h1>Tu negocio en línea, con precio cerrado y fecha de entrega.</h1>
            <p className="lead">Elige un paquete, paga el 50 % para empezar y sigue el avance de tu proyecto etapa por etapa. El resto lo pagas cuando lo apruebas.</p>
            <div className="hero-cta">
              <Link to="/catalogo" className="btn btn-primary btn-lg">Ver paquetes</Link>
              <a href="#como-funciona" className="btn btn-ghost btn-lg" onClick={(e) => { e.preventDefault(); document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' }); }}>Cómo funciona</a>
            </div>
            <ul className="hero-proof">
              <li><b className="mono">{data ? data.stats.projects?.toLocaleString('es-MX') : '…'}</b><span>proyectos vendidos</span></li>
              <li><b className="mono">{data ? data.stats.rating : '…'}<small>/5</small></b><span>{data ? data.stats.reviews : '…'} reseñas</span></li>
              <li><b className="mono">100 %</b><span>código tuyo</span></li>
            </ul>
          </div>
          <Bench cards={all} />
        </div>
      </section>

      {data && data.offers.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div><p className="eyebrow">Ofertas de noviembre</p><h2>Precios rebajados por tiempo limitado</h2></div>
              <Link to="/catalogo?orden=oferta" className="link-arrow">Ver todas las ofertas <Icon name="arrow" size={16} /></Link>
            </div>
            <div className="grid-cards">{data.offers.slice(0, 4).map((p) => <PackageCard key={p.slug} p={p} />)}</div>
          </div>
        </section>
      )}

      <section className="section section-alt">
        <div className="wrap">
          <div className="section-head"><div><p className="eyebrow">Categorías</p><h2>¿Qué necesita tu negocio?</h2></div></div>
          <div className="cat-grid">
            {(data ? data.categories : Array.from({ length: 5 })).map((c, i) => c ? (
              <Link key={c.slug} to={'/catalogo' + qs({ categoria: c.slug })} className="cat-tile">
                <span className="cat-ico"><Icon name={CAT_ICON[c.slug]} size={22} /></span>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <span className="cat-count mono">{c.count} paquetes <Icon name="arrow" size={14} /></span>
              </Link>
            ) : <div key={i} className="cat-tile"><Skeleton h={22} w={22} /><Skeleton h={18} w="60%" /><Skeleton h={12} /></div>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div><p className="eyebrow">Destacados</p><h2>Los paquetes que más eligen las pymes</h2></div>
            <Link to="/catalogo" className="link-arrow">Ver catálogo completo <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="grid-cards grid-cards-3">
            {data ? data.featured.map((p) => <PackageCard key={p.slug} p={p} />) : Array.from({ length: 4 }).map((_, i) => <div key={i} className="pcard"><Skeleton h={180} /><div className="pcard-body"><Skeleton h={16} w="70%" /><Skeleton h={12} w="40%" /></div></div>)}
          </div>
        </div>
      </section>

      <section className="section section-ink" id="como-funciona">
        <div className="wrap">
          <div className="section-head"><div><p className="eyebrow">Cómo funciona</p><h2>Pagas por avance, no a ciegas</h2></div></div>
          <ol className="steps">
            <li><span className="mono">1</span><h3>Elige paquete y plan</h3><p>Precio cerrado, entregables claros y fecha estimada antes de pagar.</p></li>
            <li><span className="mono">2</span><h3>Paga el 50 % de anticipo</h3><p>Con tarjeta, Mercado Pago, PayPal, SPEI u OXXO. Factura CFDI 4.0.</p></li>
            <li><span className="mono">3</span><h3>Sigue el avance</h3><p>Análisis, diseño, desarrollo y pruebas: ves cada etapa en tu cuenta.</p></li>
            <li><span className="mono">4</span><h3>Aprueba y recibe todo</h3><p>Pagas el saldo al aprobar y te entregamos código, accesos y manual.</p></li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head"><div><p className="eyebrow">Clientes</p><h2>Lo que dicen quienes ya trabajaron con nosotros</h2></div></div>
          <div className="testimonials">
            {(data ? data.testimonials.slice(0, 3) : []).map((t, i) => (
              <figure key={i} className="testimonial">
                <Stars value={t.rating} />
                <blockquote><b>{t.title}.</b> {t.body}</blockquote>
                <figcaption><b>{t.author}</b><span>{t.company}</span><Link to={'/producto/' + t.slug} className="tiny">{t.package}</Link></figcaption>
              </figure>
            ))}
          </div>
          <ul className="trust">
            <li><Icon name="shield" /><div><b>Pago protegido</b><span>Tu tarjeta se procesa en la pasarela con 3-D Secure.</span></div></li>
            <li><Icon name="code" /><div><b>El código es tuyo</b><span>Recibes código fuente, accesos y manual.</span></div></li>
            <li><Icon name="clock" /><div><b>5 días para arrepentirte</b><span>Cancelas sin costo y te devolvemos el anticipo.</span></div></li>
            <li><Icon name="box" /><div><b>Factura CFDI 4.0</b><span>Por cada pago, con IVA desglosado.</span></div></li>
          </ul>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap news-band">
          <div><p className="eyebrow">Boletín</p><h2>Una guía al mes para vender más en línea</h2><p className="muted">Consejos prácticos, casos de pymes de la región y avisos de ofertas. Sin spam.</p></div>
          <Newsletter />
        </div>
      </section>
    </div>
  );
}
