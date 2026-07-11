import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, User, Bot, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { aiApi } from '../services/api';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const response = await aiApi.chat(userText, messages.slice(-8));
      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
    } catch (error) {
      console.error("Chat Error:", error);
      const message = error instanceof Error ? error.message : 'Aetherion uplink interrupted.';
      setMessages(prev => [...prev, { role: 'model', content: `SYSTEM ERROR: ${message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#141414] border border-[#333] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-400" />
          <span className="font-mono text-xs uppercase tracking-widest text-gray-300">Aetherion Command Uplink</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 font-mono text-xs mt-10">
            CONNECTION ESTABLISHED. READY FOR INTELLIGENCE QUERIES.
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("flex-shrink-0 w-8 h-8 rounded bg-[#222] flex items-center justify-center", msg.role === 'user' ? "text-gray-400" : "text-blue-400")}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={cn("rounded-lg p-3 text-sm", msg.role === 'user' ? "bg-blue-900/40 text-blue-100" : "bg-[#1f1f1f] text-gray-300")}>
              <div className="markdown-body font-sans">
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="flex-shrink-0 w-8 h-8 rounded bg-[#222] flex items-center justify-center text-blue-400">
               <Loader2 size={14} className="animate-spin" />
             </div>
             <div className="bg-[#1f1f1f] rounded-lg p-3 flex items-center">
               <span className="font-mono text-xs text-gray-500 animate-pulse">PROCESSING...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[#333] bg-[#1a1a1a]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !auth.currentUser}
            placeholder={auth.currentUser ? "Enter query..." : "Authentication required to access uplink..."}
            className="flex-1 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim() || !auth.currentUser}
            className="bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-50 text-blue-400 p-2 rounded transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
