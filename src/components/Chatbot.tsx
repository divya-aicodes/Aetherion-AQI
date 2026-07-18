import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, LockKeyhole, LogIn, Send, User } from 'lucide-react';
import Markdown from 'react-markdown';
import { auth } from '../firebase';
import { aiApi } from '../services/api';

interface Message { role: 'user' | 'model'; content: string }
interface Context { city: string; country: string; aqi: number; pm25?: number; observedAt: string; source: string }

export default function Chatbot({ context, onSignIn }: { context?: Context; onSignIn: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput(''); setMessages(items => [...items, { role: 'user', content: message }]); setLoading(true);
    try {
      const result = await aiApi.chat(message, messages.slice(-6), context);
      setMessages(items => [...items, { role: 'model', content: result.text }]);
    } catch (cause) {
      setMessages(items => [...items, { role: 'model', content: cause instanceof Error ? cause.message : 'The assistant is temporarily unavailable.' }]);
    } finally { setLoading(false); }
  };

  const send = (event: React.FormEvent) => { event.preventDefault(); void ask(input); };

  const signedIn = Boolean(auth.currentUser);
  const prompts = context ? [`Can I exercise outdoors in ${context.city}?`, `Explain ${Math.round(context.aqi)} AQI simply`, 'What precautions should sensitive groups take?'] : ['What does AQI mean?', 'Explain PM2.5', 'Who is in a sensitive group?'];
  return <div className="chat-card"><div className="chat-context"><Bot size={17}/><span>{context ? `Using current context: ${context.city} · AQI ${Math.round(context.aqi)} · ${new Date(context.observedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'AQI Assistant'}</span></div><div className="messages" aria-live="polite">{messages.length === 0 && <div className="chat-welcome"><Bot size={30}/><h3>{signedIn ? 'What would you like to understand?' : 'Sign in to ask the AQI Assistant'}</h3><p>{signedIn ? 'Choose a useful starting question or write your own.' : 'Current readings remain public. Sign-in only protects the AI service from misuse.'}</p>{signedIn ? <div className="prompt-chips">{prompts.map(prompt => <button key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>)}</div> : <button className="assistant-signin" onClick={onSignIn}><LogIn size={15}/> Sign in with Google</button>}</div>}{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span>{message.role === 'user' ? <User size={15}/> : <Bot size={15}/>}</span><div><Markdown>{message.content}</Markdown></div></div>)}{loading && <div className="message model"><span><Loader2 size={15} className="spin"/></span><div>Checking the available context…</div></div>}<div ref={endRef}/></div><form className="chat-form" onSubmit={send}><div>{!signedIn && <LockKeyhole size={15}/>}<input value={input} onChange={event => setInput(event.target.value)} disabled={!signedIn || loading} maxLength={1200} placeholder={signedIn ? 'Ask about air quality…' : 'Sign in to use the AQI Assistant'}/></div><button disabled={!signedIn || loading || !input.trim()} aria-label="Send message"><Send size={17}/></button></form></div>;
}
