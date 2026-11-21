import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Icon } from './ui.jsx';

const WELCOME = { from: 'bot', text: 'Hola, soy el asistente de DevConecta. Te ayudo con precios, pagos, tiempos de entrega o el avance de tu pedido.', links: [] };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([WELCOME]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [sugs, setSugs] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => { if (open && !sugs.length) api('/chat/suggestions').then(setSugs).catch(() => {}); if (open) setTimeout(() => inputRef.current && inputRef.current.focus(), 50); }, [open, sugs.length]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, typing]);

  const send = async (message) => {
    const m = message.trim();
    if (!m) return;
    setMsgs((x) => [...x, { from: 'me', text: m }]);
    setText(''); setTyping(true); setSugs([]);
    try {
      const r = await api('/chat', { method: 'POST', body: { message: m } });
      await new Promise((res) => setTimeout(res, 350));
      setMsgs((x) => [...x, { from: 'bot', text: r.reply, links: r.links || [] }]);
      if (r.suggestions && r.suggestions.length) setSugs(r.suggestions);
    } catch {
      setMsgs((x) => [...x, { from: 'bot', text: 'No pude responder en este momento. Escríbenos desde el formulario de contacto.', links: [['Contacto', '/contacto']] }]);
    } finally { setTyping(false); }
  };

  return (
    <div className="chat">
      {open && (
        <section className="chat-panel" aria-label="Chat de ayuda">
          <header className="chat-head">
            <span className="chat-avatar"><Icon name="chat" size={18} /></span>
            <div><b>Asistente DevConecta</b><small><span className="dot-ok" /> Responde al instante · Asesores L-V 9:00 a 18:00</small></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar chat"><Icon name="close" size={18} /></button>
          </header>
          <div className="chat-list" ref={listRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={'bubble bubble-' + m.from}>
                <p>{m.text}</p>
                {m.links && m.links.length > 0 && <div className="bubble-links">{m.links.map(([label, to]) => <button key={to} onClick={() => { nav(to); }}>{label} <Icon name="arrow" size={14} /></button>)}</div>}
              </div>
            ))}
            {typing && <div className="bubble bubble-bot typing" aria-label="Escribiendo"><span /><span /><span /></div>}
          </div>
          {sugs.length > 0 && <div className="chat-sugs">{sugs.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>}
          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta" aria-label="Mensaje" maxLength={300} />
            <button className="icon-btn icon-btn-accent" aria-label="Enviar" disabled={!text.trim()}><Icon name="send" size={18} /></button>
          </form>
        </section>
      )}
      <button className={'chat-fab' + (open ? ' is-open' : '')} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar chat' : 'Abrir chat de ayuda'} aria-expanded={open}>
        <Icon name={open ? 'close' : 'chat'} size={22} />{!open && <span>¿Dudas?</span>}
      </button>
    </div>
  );
}
