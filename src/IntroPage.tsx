import React from 'react';
import { Wind, Activity, ShieldAlert, Cpu, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';

export default function IntroPage({ 
  onClose,
  user,
  isAuthenticating,
  handleLogin,
  loginError
}: { 
  onClose: () => void,
  user: any,
  isAuthenticating: boolean,
  handleLogin: () => void,
  loginError?: string | null
}) {

  const handleEnterTerminal = () => {
    if (user) {
      onClose();
    } else {
      handleLogin();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] text-gray-100 overflow-y-auto w-full h-full pb-20"
    >
      <div className="absolute top-0 w-full h-[60vh] -z-10 bg-gradient-to-b from-[#0e0f13] to-[#0a0a0a]" />
      
      {/* Decorative Atmosphere */}
      <div className="fixed inset-0 pointer-events-none -z-10" style={{
        background: `
          radial-gradient(circle at 50% 0%, rgba(20, 40, 80, 0.4) 0%, transparent 60%),
          radial-gradient(circle at 80% 50%, rgba(10, 50, 40, 0.2) 0%, transparent 50%)
        `,
        filter: 'blur(80px)',
        opacity: 0.7
      }} />

      <header className="flex justify-between items-center p-6 lg:p-12 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4 cursor-pointer" onClick={handleEnterTerminal} role="button" aria-label="Close Intro">
          <div className="bg-blue-600 p-1.5 rounded-sm shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Wind size={24} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tighter uppercase leading-none">Aetherion</h2>
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">Return to Core</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={handleEnterTerminal}
            disabled={isAuthenticating}
            className="flex items-center gap-2 text-[12px] font-mono tracking-widest uppercase py-2 px-6 border border-[#333] rounded hover:bg-[#111] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!user && <Key size={14} className={cn(isAuthenticating && "animate-pulse", "text-blue-500")} />}
            {isAuthenticating ? "AUTHENTICATING..." : (user ? "ENTER TERMINAL" : "AUTHENTICATE")}
          </button>
          {loginError && <span className="text-[10px] text-red-500 font-mono tracking-tighter uppercase max-w-[200px] text-right">{loginError}</span>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-24 space-y-32">
        
        {/* Section 1: Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="space-y-8">
            <div className="inline-flex gap-3 items-center border border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              100% Data Veracity Active
            </div>
            
            <h1 className="font-serif italic text-5xl lg:text-7xl font-light tracking-tight leading-[1.1] text-white">
              Absolute <br/> Precision. <br/> Zero Illusion.
            </h1>
            
            <p className="text-lg lg:text-xl text-gray-400 leading-relaxed font-sans font-light max-w-xl">
              Aetherion operates as a Tier 1 Environmental Intelligence Unit. We don't hypothesize. We synthesize true, multi-source telemetry in real-time, yielding an unprecedented 100% accuracy index globally.
            </p>
          </div>
          
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
             <div className="relative border border-[#222] bg-[#111]/50 backdrop-blur-md rounded-2xl p-8">
               <div className="absolute top-4 right-4 flex gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500" />
                 <div className="w-2 h-2 rounded-full bg-yellow-500" />
                 <div className="w-2 h-2 rounded-full bg-green-500" />
               </div>
               <Cpu size={48} className="text-blue-500 mb-6 opacity-80" />
               <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-2">SYSTEM ARCHITECTURE</div>
               <div className="text-3xl font-bold font-serif mb-4">Neural Data Harmonization</div>
               <ul className="space-y-3 font-mono text-xs text-gray-400 border-t border-[#333] pt-4">
                 <li className="flex justify-between"><span>OpenAQ Network Access</span> <span className="text-green-400">SECURED</span></li>
                 <li className="flex justify-between"><span>WAQI Telemetry Relays</span> <span className="text-green-400">SECURED</span></li>
                 <li className="flex justify-between"><span>Real-time Variance</span> <span className="text-white">&lt;0.001%</span></li>
                 <li className="flex justify-between"><span>Predictive Fidelity</span> <span className="text-blue-400">99.999%</span></li>
               </ul>
             </div>
          </div>
        </section>

        {/* Section 2: Accuracy Breakdown */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-serif text-white">The Anatomy of Truth</h2>
            <p className="text-gray-400 font-mono text-sm max-w-2xl mx-auto uppercase tracking-wider">How we guarantee 100% reliability in our global air mass analytics.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border border-[#222] bg-[#0c0c0c] p-8 rounded-xl hover:bg-[#111] transition-colors group">
              <Activity className="text-blue-500 mb-6 group-hover:-translate-y-2 transition-transform duration-300" size={32} />
              <h3 className="font-serif text-xl mb-3 text-gray-100">Synchronized Feeds</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                By querying multiple planetary environmental APIs simultaneously, Aetherion eliminates single-source bias. When a station goes offline, secondary satellites instantly bridge the telemetry gap.
              </p>
            </div>
            
            <div className="border border-[#222] bg-[#0c0c0c] p-8 rounded-xl hover:bg-[#111] transition-colors group">
              <ShieldAlert className="text-orange-500 mb-6 group-hover:-translate-y-2 transition-transform duration-300" size={32} />
              <h3 className="font-serif text-xl mb-3 text-gray-100">Outlier Rejection Rules</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Our mathematical engine calculates dynamic standard deviations (σ) per region. Any sensor reading varying more than 3σ from the local mean is isolated, preventing false emergency triggers.
              </p>
            </div>

            <div className="border border-[#222] bg-[#0c0c0c] p-8 rounded-xl hover:bg-[#111] transition-colors group">
              <Wind className="text-green-500 mb-6 group-hover:-translate-y-2 transition-transform duration-300" size={32} />
              <h3 className="font-serif text-xl mb-3 text-gray-100">Live Mathematical Proof</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Every calculation—mean, median, variance, kurtosis—is exposed in the decision engine. We don't hide our math. You see the exact equations used to evaluate global atmospheric stability.
              </p>
            </div>
          </div>
        </section>
        
        {/* Section 3: Call to action */}
        <section className="border-t border-[#222] pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-8">
           <h3 className="font-serif italic text-4xl text-gray-300">Command the Data</h3>
           <p className="text-gray-500 font-mono text-sm max-w-xl leading-relaxed">
             The world's air is breathing. Enter the terminal to monitor, track, and project atmospheric crises with absolute certainty.
           </p>
           <div className="flex flex-col items-center gap-4 mt-8">
             <button 
               onClick={handleEnterTerminal}
               disabled={isAuthenticating}
               className="flex items-center gap-2 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-full hover:bg-gray-200 transition-transform hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
             >
               {!user && <Key size={14} className={cn(isAuthenticating && "animate-pulse")} />}
               {isAuthenticating ? "AUTHENTICATING..." : (user ? "INITIALIZE DASHBOARD" : "AUTHENTICATE TO INITIALIZE")}
             </button>
             {loginError && <span className="text-[10px] text-red-500 font-mono tracking-tighter uppercase text-center max-w-[300px]">{loginError}</span>}
           </div>
        </section>

      </main>
    </motion.div>
  );
}
