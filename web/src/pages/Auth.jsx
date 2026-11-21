import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store.jsx';
import { Field, Alert, Icon } from '../components/ui.jsx';
import { DEMO } from '../lib/api.js';

export function Login() {
  const { login, toast } = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const u = await login(f.email, f.password);
      toast(`Hola de nuevo, ${u.name.split(' ')[0]}.`);
      nav(params.get('volver') || (u.role === 'admin' ? '/admin' : '/cuenta'));
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="wrap page auth">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>Iniciar sesión</h1>
        <p className="muted">Sigue tus proyectos, paga saldos y guarda tu carrito.</p>
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Correo" id="l-mail"><input id="l-mail" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoFocus /></Field>
        <Field label="Contraseña" id="l-pass">
          <div className="input-icon"><input id="l-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" className="link tiny" onClick={() => setShow((s) => !s)}>{show ? 'Ocultar' : 'Mostrar'}</button></div>
        </Field>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
        <p className="center">¿No tienes cuenta? <Link to={'/registro' + (params.get('volver') ? '?volver=' + params.get('volver') : '')}>Crear cuenta</Link></p>
        <div className="demo-creds">
          <p className="tiny"><Icon name="info" size={14} /> Cuentas de prueba{DEMO ? ' (demo)' : ''}:</p>
          <button type="button" className="link tiny" onClick={() => setF({ email: 'cliente@demo.mx', password: 'Cliente123!' })}>Cliente: cliente@demo.mx · Cliente123!</button>
          <button type="button" className="link tiny" onClick={() => setF({ email: 'admin@devconecta.mx', password: 'Admin123!' })}>Administrador: admin@devconecta.mx · Admin123!</button>
        </div>
      </form>
    </div>
  );
}

export function Register() {
  const { register, toast } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', email: (loc.state && loc.state.email) || '', phone: '', password: '', newsletter: false, privacy: false });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const strength = [f.password.length >= 8, /\d/.test(f.password), /[a-zA-Z]/.test(f.password)];
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!f.privacy) { setErr('Acepta el aviso de privacidad para crear tu cuenta.'); return; }
    setBusy(true);
    try {
      await register(f);
      toast('Tu cuenta está lista.');
      nav(params.get('volver') || '/cuenta');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="wrap page auth">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>Crear cuenta</h1>
        <p className="muted">Si ya compraste como invitado con este correo, tus pedidos aparecerán en tu cuenta.</p>
        {err && <Alert tone="danger">{err}</Alert>}
        <Field label="Nombre completo" id="r-name"><input id="r-name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Correo" id="r-mail"><input id="r-mail" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Teléfono" id="r-tel" optional><input id="r-tel" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Contraseña" id="r-pass">
          <input id="r-pass" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <ul className="pass-rules">
            {['8 caracteres o más', 'Al menos un número', 'Al menos una letra'].map((t, i) => <li key={t} className={strength[i] ? 'is-ok' : ''}><Icon name="check" size={13} />{t}</li>)}
          </ul>
        </Field>
        <label className="toggle-line"><input type="checkbox" checked={f.newsletter} onChange={(e) => setF({ ...f, newsletter: e.target.checked })} /> Quiero recibir la guía mensual y ofertas</label>
        <label className="toggle-line"><input type="checkbox" checked={f.privacy} onChange={(e) => setF({ ...f, privacy: e.target.checked })} /> <span>Leí y acepto el <Link to="/politicas/privacidad">aviso de privacidad</Link></span></label>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        <p className="center">¿Ya tienes cuenta? <Link to="/entrar">Inicia sesión</Link></p>
      </form>
    </div>
  );
}
