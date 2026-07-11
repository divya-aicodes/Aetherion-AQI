import React, { useState } from 'react';
import { Brain, FileDigit, Play, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { auth } from '../firebase';
import { aiApi } from '../services/api';

export default function HighThinking() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generateStrategy = async () => {
    if (!query.trim() || !auth.currentUser) return;
    setLoading(true);
    setResult('');
    try {
      const response = await aiApi.strategy(query);
      setResult(response.text);
    } catch (err) {
      console.error(err);
      setResult(`SYSTEM FAULT: ${err instanceof Error ? err.message : 'Unable to generate strategy.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#141414] border border-[#333] rounded-lg overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex items-center gap-2">
         <Brain size={18} className="text-purple-400" />
         <span className="font-mono text-xs uppercase tracking-widest text-gray-300">Deep Strategy Nexus (High Thinking)</span>
      </div>
      
      <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
        <p className="text-gray-400 text-sm">
          AETHERION will allocate maximum compute to construct an intricate, multi-layered strategic breakdown for complex operational goals.
        </p>

        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading || !auth.currentUser}
          placeholder={auth.currentUser ? "Describe your complex environmental objective (e.g., 'Draft a 10-year master plan to reduce PM2.5 in New Delhi by 60% without stunting economic growth')..." : "Authentication required..."}
          className="bg-[#0f0f0f] border border-[#333] rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 resize-none h-24"
        />

        <button 
          onClick={generateStrategy}
          disabled={loading || !query.trim() || !auth.currentUser}
          className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 rounded py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? "CALCULATING STRATEGY..." : "INITIATE DEEP COMPUTATION"}
        </button>

        {result && (
          <div className="bg-[#1a1a1a] p-4 rounded border border-[#222] mt-4 flex-1">
             <div className="markdown-body font-sans text-sm text-gray-300">
               <Markdown>{result}</Markdown>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
