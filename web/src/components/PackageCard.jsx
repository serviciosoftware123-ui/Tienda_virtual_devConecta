import { Link } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { Icon, Stars, Price, Badge } from './ui.jsx';
import Mockup from './Mockup.jsx';

export function stockLabel(p) {
  if (p.available <= 0) return { tone: 'danger', text: 'Sin cupo este mes' };
  if (p.available <= 2) return { tone: 'warn', text: `Últimos ${p.available} cupos del mes` };
  return { tone: 'ok', text: `${p.available} cupos este mes` };
}

export default function PackageCard({ p, layout = 'grid' }) {
  const { wish, toggleWish } = useStore();
  const saved = wish.includes(p.slug);
  const st = stockLabel(p);
  return (
    <article className={'pcard pcard-' + layout}>
      <Link to={'/producto/' + p.slug} className="pcard-media" aria-label={p.name} tabIndex={-1}>
        <Mockup kind={p.kind} seed={p.slug} title={'Vista previa: ' + p.name} />
        <span className="pcard-flags">
          {p.offer_pct > 0 && <Badge tone="accent">−{p.offer_pct} %</Badge>}
          {new Date(p.created_at) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 75) && <Badge>Nuevo</Badge>}
        </span>
      </Link>
      <button className={'wish' + (saved ? ' is-on' : '')} onClick={() => toggleWish(p.slug, p.name)} aria-pressed={saved} aria-label={saved ? 'Quitar de la lista de deseos' : 'Guardar en la lista de deseos'}>
        <Icon name="heart" size={18} fill={saved} />
      </button>
      <div className="pcard-body">
        <p className="eyebrow">{p.sub_name || p.category_name}</p>
        <h3><Link to={'/producto/' + p.slug}>{p.name}</Link></h3>
        {layout === 'list' && <p className="muted pcard-short">{p.short}</p>}
        <div className="pcard-meta">
          {p.reviews_count > 0 ? <Stars value={p.rating} count={p.reviews_count} /> : <span className="tiny muted">Sin reseñas aún</span>}
        </div>
        <ul className="chips">{p.techs.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="pcard-foot">
          <Price price={p.price} list={p.list} unit={p.unit} from />
          <span className={'stock stock-' + st.tone}>{st.text}</span>
        </div>
      </div>
    </article>
  );
}
