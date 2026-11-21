// Ilustraciones vectoriales de cada paquete: muestran cómo se ve lo que se compra.
// Al ser SVG, se pueden ampliar sin perder calidad (zoom de la galería).

const C = { frame: '#FFFFFF', chrome: '#ECEAE5', b1: '#E6E3DD', b2: '#D5D1C8', ink: '#1F2328', ink2: '#4A5059', acc: '#1F5F7A', acc2: '#5E8FA3', soft: '#D6E5EB', soft2: '#EEF4F6', ok: '#4E8B6E', warn: '#C59A4A' };

function hash(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
const R = ({ x, y, w, h, f = C.b1, r = 3, o }) => <rect x={x} y={y} width={w} height={h} rx={r} fill={f} opacity={o} />;
const bars = (x, y, widths, h = 6, gap = 11, f = C.b2) => widths.map((w, i) => <R key={i} x={x} y={y + i * gap} w={w} h={h} f={f} r={h / 2} />);

function Browser({ children, url = 'tunegocio.mx' }) {
  return (
    <g>
      <R x={0} y={0} w={480} h={340} f={C.frame} r={10} />
      <path d="M0 10a10 10 0 0 1 10-10h460a10 10 0 0 1 10 10v20H0z" fill={C.chrome} />
      <circle cx={16} cy={15} r={4} fill="#D9655B" opacity=".7" /><circle cx={29} cy={15} r={4} fill="#D9B45B" opacity=".7" /><circle cx={42} cy={15} r={4} fill="#6FAE7A" opacity=".7" />
      <R x={150} y={7} w={180} h={16} f="#fff" r={8} />
      <text x={240} y={18.5} fontSize="8.5" fontFamily="IBM Plex Mono, monospace" fill={C.ink2} textAnchor="middle">🔒 {url}</text>
      <g transform="translate(0,30)">{children}</g>
    </g>
  );
}

function Nav({ cart, search }) {
  return (
    <g>
      <R x={20} y={14} w={56} h={12} f={C.ink} r={3} />
      {search ? <R x={150} y={11} w={170} h={18} f={C.b1} r={9} /> : [0, 1, 2].map((i) => <R key={i} x={210 + i * 54} y={17} w={40} h={6} f={C.b2} />)}
      {cart ? <g><circle cx={420} cy={20} r={9} fill={C.b1} /><circle cx={443} cy={20} r={9} fill={C.soft} /><circle cx={449} cy={14} r={4} fill={C.acc} /></g>
        : <R x={392} y={11} w={68} h={18} f={C.acc} r={9} />}
    </g>
  );
}

function Landing({ s }) {
  return (
    <Browser url="campana.tunegocio.mx">
      <Nav />
      <R x={20} y={56} w={200} h={16} f={C.ink} />
      <R x={20} y={78} w={160} h={16} f={C.ink} />
      {bars(20, 106, [190, 170, 120])}
      <R x={20} y={148} w={92} h={24} f={C.acc} r={12} />
      <R x={120} y={148} w={80} h={24} f={C.frame} r={12} />
      <rect x={120.5} y={148.5} width={79} height={23} rx={11.5} fill="none" stroke={C.b2} />
      <R x={250} y={50} w={210} h={130} f={C.soft} r={10} />
      <circle cx={318} cy={100} r={26} fill={C.acc2} opacity=".55" />
      <path d={`M262 170 L${330 + (s % 30)} 118 L${376 + (s % 20)} 150 L410 128 L448 170z`} fill={C.acc} opacity=".55" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${20 + i * 150},200)`}>
          <R x={0} y={0} w={136} h={92} f={C.frame} r={8} />
          <rect x={0.5} y={0.5} width={135} height={91} rx={7.5} fill="none" stroke={C.b1} />
          <circle cx={22} cy={24} r={10} fill={C.soft} />
          {bars(12, 44, [96, 110, 70])}
        </g>
      ))}
    </Browser>
  );
}

function Corporate() {
  return (
    <Browser url="www.tuempresa.com.mx">
      <Nav />
      <R x={20} y={42} w={440} h={120} f={C.ink} r={8} />
      <R x={44} y={74} w={190} h={14} f="#fff" o=".9" />
      {bars(44, 98, [150, 120], 6, 11, '#ffffff66')}
      <R x={44} y={126} w={80} h={18} f={C.acc2} r={9} />
      <path d="M300 162 L360 100 L400 130 L440 92 L460 110 V162z" fill="#ffffff22" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${20 + i * 150},176)`}>
          <R x={0} y={0} w={136} h={64} f={i === 1 ? C.soft : C.b1} r={6} />
          {bars(0, 74, [110, 126, 80])}
        </g>
      ))}
      <R x={0} y={290} w={480} h={20} f={C.chrome} r={0} />
    </Browser>
  );
}

function Store({ s, catalog }) {
  const tones = [C.soft, C.b1, '#E9E1D3', C.soft2, '#DCE3DE', C.b1, C.soft, '#E9E1D3'];
  return (
    <Browser url={catalog ? 'catalogo.tunegocio.mx' : 'tienda.tunegocio.mx'}>
      <Nav cart search />
      {!catalog && <g>{bars(20, 52, [70, 56, 62, 48, 66], 6, 16)}<R x={20} y={140} w={70} h={30} f={C.b1} r={6} /></g>}
      {Array.from({ length: 8 }).map((_, i) => {
        const cols = 4; const x0 = catalog ? 20 : 108; const w = catalog ? 104 : 82; const gap = catalog ? 8 : 6;
        const x = x0 + (i % cols) * (w + gap); const y = 46 + Math.floor(i / cols) * 128;
        return (
          <g key={i}>
            <R x={x} y={y} w={w} h={74} f={tones[(i + s) % tones.length]} r={6} />
            <circle cx={x + w / 2} cy={y + 37} r={14} fill="#fff" opacity=".6" />
            <R x={x} y={y + 82} w={w - 16} h={6} f={C.b2} />
            <R x={x} y={y + 94} w={w * 0.45} h={8} f={C.ink} />
            {catalog ? <R x={x + w - 34} y={y + 92} w={34} h={14} f={C.ok} r={7} o=".85" /> : <R x={x + w - 18} y={y + 92} w={18} h={14} f={C.acc} r={7} />}
          </g>
        );
      })}
    </Browser>
  );
}

function Checkout() {
  return (
    <Browser url="tunegocio.mx/pago">
      <Nav cart />
      {[0, 1, 2].map((i) => <g key={i}><circle cx={40 + i * 90} cy={58} r={8} fill={i < 2 ? C.acc : C.b2} /><R x={52 + i * 90} y={55} w={50} h={6} f={C.b2} /></g>)}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}><R x={30} y={84 + i * 46} w={70} h={5} f={C.b2} /><R x={30} y={94 + i * 46} w={250} h={22} f={C.frame} r={5} /><rect x={30.5} y={94.5 + i * 46} width={249} height={21} rx={4.5} fill="none" stroke={C.b2} /></g>
      ))}
      <R x={300} y={80} w={160} h={210} f={C.soft2} r={8} />
      {bars(316, 98, [90, 110, 70, 100])}
      <R x={316} y={150} w={128} h={1} f={C.b2} />
      <R x={316} y={162} w={60} h={10} f={C.ink} />
      <R x={316} y={244} w={128} h={28} f={C.acc} r={6} />
      <R x={348} y={255} w={64} h={6} f="#fff" o=".85" />
    </Browser>
  );
}

function Sidebar({ items = 6 }) {
  return (
    <g>
      <R x={0} y={0} w={92} h={310} f={C.ink} r={0} />
      <R x={14} y={14} w={50} h={10} f="#fff" o=".9" />
      {Array.from({ length: items }).map((_, i) => <R key={i} x={14} y={46 + i * 22} w={i === 1 ? 64 : 54} h={8} f={i === 1 ? C.acc2 : '#ffffff40'} />)}
    </g>
  );
}

function Dashboard({ s, kind }) {
  const pts = Array.from({ length: 9 }).map((_, i) => [120 + i * 40, 230 - ((s >> i) % 7) * 12 - i * 6]);
  return (
    <Browser url={kind === 'erp' ? 'erp.tuempresa.mx' : 'panel.tunegocio.mx'}>
      <Sidebar />
      {[0, 1, 2].map((i) => (
        <g key={i}><R x={108 + i * 120} y={16} w={110} h={58} f={C.frame} r={8} /><rect x={108.5 + i * 120} y={16.5} width={109} height={57} rx={7.5} fill="none" stroke={C.b1} />
          <R x={120 + i * 120} y={28} w={50} h={5} f={C.b2} /><R x={120 + i * 120} y={42} w={64} h={14} f={i === 0 ? C.acc : C.ink} /></g>
      ))}
      <R x={108} y={86} w={350} h={160} f={C.frame} r={8} />
      <rect x={108.5} y={86.5} width={349} height={159} rx={7.5} fill="none" stroke={C.b1} />
      {kind === 'erp'
        ? Array.from({ length: 8 }).map((_, i) => <R key={i} x={130 + i * 40} y={230 - (20 + ((s >> i) % 6) * 18)} w={22} h={20 + ((s >> i) % 6) * 18} f={i % 3 === 0 ? C.acc : C.soft} r={3} />)
        : <g><polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.acc} strokeWidth="3" strokeLinejoin="round" />
          <polygon points={`120,236 ${pts.map((p) => p.join(',')).join(' ')} 440,236`} fill={C.soft} opacity=".6" /></g>}
      {[0, 1].map((i) => <g key={i}><R x={108} y={258 + i * 22} w={350} h={16} f={i % 2 ? C.frame : C.soft2} r={4} />{bars(118, 263 + i * 22, [80], 6)}<R x={380} y={262 + i * 22} w={60} h={8} f={C.b2} /></g>)}
    </Browser>
  );
}

function Pos() {
  return (
    <Browser url="caja.tunegocio.mx">
      <Sidebar items={5} />
      <R x={106} y={12} w={220} h={20} f={C.b1} r={10} />
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i}><R x={106 + (i % 3) * 76} y={44 + Math.floor(i / 3) * 84} w={68} h={74} f={i % 4 === 0 ? C.soft : C.b1} r={6} />
          <R x={114 + (i % 3) * 76} y={96 + Math.floor(i / 3) * 84} w={40} h={6} f={C.b2} /><R x={114 + (i % 3) * 76} y={106 + Math.floor(i / 3) * 84} w={26} h={6} f={C.ink} /></g>
      ))}
      <R x={340} y={12} w={126} h={286} f={C.soft2} r={8} />
      {Array.from({ length: 6 }).map((_, i) => <g key={i}><R x={352} y={30 + i * 22} w={60} h={6} f={C.b2} /><R x={430} y={30 + i * 22} w={24} h={6} f={C.ink2} /></g>)}
      <R x={352} y={176} w={102} h={1} f={C.b2} />
      <R x={352} y={190} w={50} h={14} f={C.ink} />
      <R x={352} y={254} w={102} h={30} f={C.acc} r={6} />
    </Browser>
  );
}

function Agenda({ s }) {
  return (
    <Browser url="citas.tuconsultorio.mx">
      <Sidebar items={5} />
      <R x={108} y={14} w={120} h={12} f={C.ink} />
      <R x={378} y={10} w={80} h={20} f={C.acc} r={10} />
      {Array.from({ length: 35 }).map((_, i) => {
        const x = 108 + (i % 7) * 50; const y = 40 + Math.floor(i / 7) * 52;
        const busy = (s >> (i % 24)) & 1;
        return (
          <g key={i}><R x={x} y={y} w={46} h={48} f={i === 17 ? C.soft : C.frame} r={5} /><rect x={x + 0.5} y={y + 0.5} width={45} height={47} rx={4.5} fill="none" stroke={C.b1} />
            <R x={x + 5} y={y + 5} w={10} h={5} f={C.b2} />
            {busy ? <R x={x + 4} y={y + 16} w={38} h={10} f={i % 3 ? C.acc2 : C.acc} r={3} o=".85" /> : null}
            {busy && i % 2 ? <R x={x + 4} y={y + 30} w={30} h={10} f={C.soft} r={3} /> : null}</g>
        );
      })}
    </Browser>
  );
}

function Terminal() {
  const lines = [[C.acc2, 120], ['#9AA3AE', 210], ['#9AA3AE', 170], [C.ok, 140], ['#9AA3AE', 230], [C.warn, 110], ['#9AA3AE', 190], [C.ok, 150], ['#9AA3AE', 90]];
  return (
    <Browser url="estado.tunegocio.mx">
      <R x={20} y={16} w={270} h={280} f="#1B1F24" r={8} />
      {lines.map(([f, w], i) => <g key={i}><R x={36} y={36 + i * 26} w={10} h={7} f={C.acc2} o=".8" /><R x={54} y={36 + i * 26} w={w} h={7} f={f} o=".85" /></g>)}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}><R x={306} y={16 + i * 72} w={154} h={62} f={C.frame} r={8} /><rect x={306.5} y={16.5 + i * 72} width={153} height={61} rx={7.5} fill="none" stroke={C.b1} />
          <circle cx={324} cy={36 + i * 72} r={6} fill={i === 2 ? C.warn : C.ok} /><R x={338} y={32 + i * 72} w={80} h={7} f={C.ink2} />{bars(318, 52 + i * 72, [110], 5)}</g>
      ))}
    </Browser>
  );
}

function Cloud() {
  const box = (x, y, label, f) => (
    <g><R x={x} y={y} w={96} h={56} f={f} r={8} /><text x={x + 48} y={y + 33} fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fill={f === C.ink ? '#fff' : C.ink}>{label}</text></g>
  );
  return (
    <Browser url="consola.nube.mx">
      <rect x={130} y={20} width={330} height={270} rx={14} fill={C.soft2} stroke={C.acc2} strokeDasharray="6 5" />
      <text x={146} y={42} fontSize="10" fontFamily="IBM Plex Mono, monospace" fill={C.acc}>docker compose · nube</text>
      <circle cx={60} cy={150} r={22} fill={C.b1} /><R x={44} y={180} w={32} h={6} f={C.b2} />
      <path d="M84 150 H150" stroke={C.ink2} strokeWidth="2" markerEnd="url(#ar)" />
      {box(152, 122, 'nginx', C.frame)}
      <path d="M248 150 H284" stroke={C.ink2} strokeWidth="2" markerEnd="url(#ar)" />
      {box(286, 70, 'api', C.ink)}
      {box(286, 174, 'api', C.ink)}
      <path d="M382 98 H410 V150 M382 202 H410 V150" stroke={C.ink2} strokeWidth="2" fill="none" />
      <ellipse cx={430} cy={130} rx={22} ry={7} fill={C.acc} /><R x={408} y={130} w={44} h={40} f={C.acc} r={0} /><ellipse cx={430} cy={170} rx={22} ry={7} fill={C.acc} />
      <text x={430} y={196} fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fill={C.ink2}>postgres</text>
      <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill={C.ink2} /></marker></defs>
    </Browser>
  );
}

function Phone({ kind, s, variant = 0 }) {
  const store = ['store', 'catalog', 'checkout'].includes(kind);
  const agenda = kind === 'agenda';
  return (
    <g>
      <R x={155} y={10} w={170} h={320} f={C.ink} r={26} />
      <R x={163} y={18} w={154} h={304} f={C.frame} r={20} />
      <R x={214} y={24} w={52} h={9} f={C.ink} r={5} />
      <g transform="translate(173,44)">
        <R x={0} y={0} w={60} h={10} f={C.ink} />
        <circle cx={128} cy={5} r={7} fill={C.soft} />
        {variant === 0 && <g><R x={0} y={22} w={134} h={70} f={C.acc} r={10} />
          <R x={12} y={38} w={70} h={9} f="#fff" o=".9" /><R x={12} y={53} w={50} h={6} f="#fff" o=".6" /><R x={12} y={70} w={44} h={12} f="#fff" r={6} o=".95" /></g>}
        {store && Array.from({ length: variant ? 6 : 4 }).map((_, i) => (
          <g key={i}><R x={(i % 2) * 70} y={(variant ? 22 : 104) + Math.floor(i / 2) * 74} w={64} h={48} f={[C.soft, C.b1, '#E9E1D3', C.soft2][(i + s) % 4]} r={8} />
            <R x={(i % 2) * 70} y={(variant ? 76 : 158) + Math.floor(i / 2) * 74} w={44} h={5} f={C.b2} /><R x={(i % 2) * 70} y={(variant ? 85 : 167) + Math.floor(i / 2) * 74} w={26} h={6} f={C.ink} /></g>
        ))}
        {agenda && Array.from({ length: variant ? 7 : 5 }).map((_, i) => (
          <g key={i}><R x={0} y={(variant ? 22 : 104) + i * 30} w={30} h={22} f={C.soft2} r={5} /><R x={38} y={(variant ? 22 : 104) + i * 30} w={96} h={22} f={i % 2 ? C.b1 : C.soft} r={5} /><R x={44} y={(variant ? 30 : 112) + i * 30} w={50} h={6} f={C.ink2} /></g>
        ))}
        {!store && !agenda && Array.from({ length: variant ? 6 : 4 }).map((_, i) => (
          <g key={i}><R x={0} y={(variant ? 22 : 104) + i * 40} w={134} h={32} f={C.frame} r={8} /><rect x={0.5} y={(variant ? 22.5 : 104.5) + i * 40} width={133} height={31} rx={7.5} fill="none" stroke={C.b1} />
            <circle cx={16} cy={(variant ? 38 : 120) + i * 40} r={8} fill={i % 2 ? C.soft : C.acc2} opacity=".8" /><R x={30} y={(variant ? 32 : 114) + i * 40} w={70} h={6} f={C.ink2} /><R x={30} y={(variant ? 42 : 124) + i * 40} w={46} h={5} f={C.b2} /></g>
        ))}
      </g>
      <R x={163} y={290} w={154} h={32} f={C.soft2} r={0} />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={186 + i * 36} cy={306} r={5} fill={i === 0 ? C.acc : C.b2} />)}
    </g>
  );
}

const DESKTOP = { landing: Landing, corporate: Corporate, store: Store, catalog: (p) => <Store {...p} catalog />, checkout: Checkout, dashboard: Dashboard, erp: Dashboard, pos: Pos, agenda: Agenda, maintenance: Terminal, cloud: Cloud, android: Dashboard, crossplatform: Dashboard };
const APP = ['android', 'crossplatform'];

export function galleryViews(kind) {
  return APP.includes(kind)
    ? [{ id: 'm0', label: 'App: inicio' }, { id: 'm1', label: 'App: listado' }, { id: 'd', label: 'Panel web' }, { id: 'z', label: 'Detalle' }]
    : [{ id: 'd', label: 'Computadora' }, { id: 'm0', label: 'Celular' }, { id: 'z', label: 'Detalle' }];
}

export default function Mockup({ kind = 'landing', seed = 'x', view, className = '', title }) {
  const s = hash(seed);
  const isApp = APP.includes(kind);
  const v = view || (isApp ? 'm0' : 'd');
  const Desk = DESKTOP[kind] || Landing;
  let content;
  let viewBox = '0 0 480 340';
  if (v === 'm0' || v === 'm1') content = <Phone kind={kind} s={s} variant={v === 'm1' ? 1 : 0} />;
  else if (v === 'z') {
    if (isApp) { content = <Phone kind={kind} s={s} />; viewBox = '160 40 160 113'; }
    else { content = <Desk s={s} kind={kind} />; viewBox = '200 40 240 170'; }
  } else content = <Desk s={s} kind={kind} />;
  return (
    <svg className={'mockup ' + className} viewBox={viewBox} role="img" aria-label={title || 'Vista previa del proyecto'} preserveAspectRatio="xMidYMid meet">
      {content}
    </svg>
  );
}
