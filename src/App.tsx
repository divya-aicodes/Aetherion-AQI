/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ReferenceLine, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  Wind, Activity, Brain, Calculator, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Info, Settings2,
  TrendingUp, Zap, Globe, MapPin, ShieldCheck, AlertCircle, Skull, Target, Command, Camera, Key
} from 'lucide-react';
import { cn, statsUtils } from './lib/utils';
import { STRATEGIES, AQIStrategy } from './lib/strategies';
import { AQIData, SimulationResult } from './types';
import AetherionMap from './components/AetherionMap';
import Chatbot from './components/Chatbot';
import HighThinking from './components/HighThinking';
import { aiApi } from './services/api';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Markdown from 'react-markdown';
import DecisionEngine from './DecisionEngine';
import IntroPage from './IntroPage';

// UI Components
const Card = ({ children, className, title, icon: Icon }: any) => (
  <div className={cn("bg-[#141414] border border-[#333] rounded-lg overflow-hidden flex flex-col", className)}>
    {title && (
      <div className="px-4 py-2 border-bottom border-[#333] flex items-center justify-between bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-gray-400" />}
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium font-mono">
            {title}
          </span>
        </div>
      </div>
    )}
    <div className="p-4 flex-1">
      {children}
    </div>
  </div>
);

const MathBox = (props: any) => {
  const { label, formula, value, insight, children } = props;
  return (
    <div className="bg-[#0f0f0f] border border-[#222] p-3 rounded font-mono text-xs overflow-hidden">
      <div className="text-gray-500 mb-1 uppercase text-[9px] tracking-tighter flex items-center justify-between gap-1">
        <div className="flex items-center gap-1"><Calculator size={10} /> {label}</div>
        {value && <span className="text-blue-400 font-bold">{value}</span>}
      </div>
      <div className="text-gray-400 py-1 font-serif italic text-[11px] border-b border-[#222] mb-2 flex justify-between items-end">
        <span>{formula}</span>
      </div>
      <div className="text-gray-300/80 leading-relaxed mb-3 text-[10.5px]">
        {insight}
      </div>
      {children && (
        <div className="pt-2 h-32 w-full">
           {children}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [aqiData, setAqiData] = useState<AQIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [showGlobalGrid, setShowGlobalGrid] = useState(true);
  const [showLethalOnly, setShowLethalOnly] = useState(false);
  const [interventions, setInterventions] = useState({
    carUsage: 30, // % reduction
    publicTransport: 20, // % adoption
    industrial: 15, // % reduction
    emergency: false
  });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'decision-engine' | 'chat' | 'visuals' | 'deepthink'>('dashboard');
  const [simulating, setSimulating] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState(false);
  const [lastAqiSync, setLastAqiSync] = useState<string | null>(null);
  const [focusedCityId, setFocusedCityId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        setLoginError(`This domain is not authorized in Firebase. Add "${window.location.hostname}" under Authentication → Settings → Authorized domains.`);
      } else if (error?.code === 'auth/popup-closed-by-user') {
         setLoginError("Login popup was closed. Please try again.");
      } else if (error?.code !== 'auth/cancelled-popup-request') {
        setLoginError("Authentication failed: " + error.message);
        console.error("Authentication failed:", error);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      await logout();
      setActiveTab('dashboard');
      setShowDisconnectConfirm(false);
      setShowIntro(true);
    } finally {
      setIsDisconnecting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid, "config", "main")).then(d => {
        if (d.exists()) {
          const data = d.data();
          if (data.interventions) setInterventions(data.interventions);
          if (data.selectedStrategies) setSelectedStrategies(data.selectedStrategies);
        }
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setDoc(doc(db, "users", user.uid, "config", "main"), {
          interventions,
          selectedStrategies,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(console.error);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [interventions, selectedStrategies, user]);

  useEffect(() => {
    fetchAQI();
    
    // Global Pulse: Auto-refresh every 20 seconds
    const interval = setInterval(() => {
      fetchAQI(false); 
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAQI = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Fetching Global Sweep Data
      const res = await axios.get(`/api/aqi/live?v=2`, { headers: { 'Cache-Control': 'no-cache' } });
      setAqiData(res.data.results || []);
      setLastAqiSync(res.data.meta?.timestamp || new Date().toISOString());
      setOfflineStatus(false);
    } catch (err: any) {
      setOfflineStatus(true);
      if (err.message === 'Network Error') {
        console.warn('Aetherion Uplink: Network connection to HQ temporarily interrupted. Entering offline mode.');
      } else {
        console.error('AQI Data Sync Error:', err.message);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const values = useMemo(() => aqiData.map(d => d.value), [aqiData]);
  
  const stats = useMemo(() => {
    if (values.length === 0) return null;
    return {
      mean: statsUtils.mean(values),
      median: statsUtils.median(values),
      stdDev: statsUtils.stdDev(values),
      skewness: statsUtils.skewness(values),
      kurtosis: statsUtils.kurtosis(values),
      range: statsUtils.range(values)
    };
  }, [values]);

  const strategyReasoning = useMemo(() => {
    if (!stats) return null;
    let reason = "Standard Tit-for-Tat baseline recommended.";
    let strat = "Tit-for-Tat";
    
    if (stats.kurtosis > 1) {
      reason = "Extreme event frequency (high kurtosis) suggests robust containment protocols.";
      strat = "Grim Trigger + Pavlov";
    } else if (Math.abs(stats.skewness) > 0.5) {
      reason = "Significant predictive asymmetry (skewness) requires adaptive pattern detection.";
      strat = "Pattern Detection + Generous TFT";
    } else if (stats.stdDev > 20) {
      reason = "High volatility (variance) detected. Stability-focused strategies are prioritized.";
      strat = "Regret Minimization";
    }
    return { reason, strat };
  }, [stats]);

  // Reactive simulation - calculates impact on every slider/strategy change
  const currentSimResult = useMemo(() => {
    let currentStats = stats;
    if (!currentStats) {
      currentStats = { mean: 85.4, median: 78.2, stdDev: 22.4, skewness: 1.12, kurtosis: 0.85, range: 120 };
    }

    const baseAqi = currentStats.mean;
    const invImpacts = {
      car: interventions.carUsage * 0.4,
      transit: interventions.publicTransport * 0.3,
      industry: interventions.industrial * 0.6,
      emergency: interventions.emergency ? 50 : 0
    };
    
    const interventionImpact = (invImpacts.car + invImpacts.transit + invImpacts.industry + invImpacts.emergency) / 100;

    const selectedStratObjects = STRATEGIES.filter(s => selectedStrategies.includes(s.id));
    const strategyImpact = selectedStratObjects.reduce((acc, s) => {
      const effect = (s.modifierRange[0] + s.modifierRange[1]) / 2;
      return acc + effect;
    }, 0) / (selectedStratObjects.length || 1);

    const R = (interventionImpact * 0.65) + (strategyImpact * 0.35);
    const newAqi = baseAqi * (1 - R * 0.65);

    return {
      oldAqi: baseAqi,
      newAqi: newAqi,
      change: baseAqi - newAqi,
      percentImprovement: ((baseAqi - newAqi) / baseAqi) * 100,
      R,
      breakdown: {
        car: invImpacts.car / 100,
        transit: invImpacts.transit / 100,
        industry: invImpacts.industry / 100,
        emergency: invImpacts.emergency / 100,
        strategies: strategyImpact
      }
    };
  }, [stats, interventions, selectedStrategies]);
const simulatedValues = useMemo(() => {
    const rFactor = Math.max(0, 1 - currentSimResult.R * 0.65);
    return values.map(v => v * rFactor);
  }, [values, currentSimResult.R]);

  const simulatedStats = useMemo(() => {
    if (simulatedValues.length === 0) return null;
    return {
      mean: statsUtils.mean(simulatedValues),
      median: statsUtils.median(simulatedValues),
      stdDev: statsUtils.stdDev(simulatedValues),
      skewness: statsUtils.skewness(simulatedValues),
      kurtosis: statsUtils.kurtosis(simulatedValues),
      range: statsUtils.range(simulatedValues)
    };
  }, [simulatedValues]);

  const bothHistogramData = useMemo(() => {
    if (values.length === 0 || simulatedValues.length === 0) return [];
    
    const allValues = [...values, ...simulatedValues];
    const min = Math.floor(Math.min(...allValues) / 10) * 10;
    const max = Math.ceil(Math.max(...allValues) / 10) * 10;
    const binSize = Math.max(10, Math.ceil((max - min) / 15));
    
    const bins: { name: string; base: number; sim: number; binCenter: number }[] = [];
    for (let i = min; i <= max; i += binSize) {
      bins.push({ name: `${i}`, base: 0, sim: 0, binCenter: i + binSize / 2 });
    }
    
    values.forEach(val => {
      const bIdx = Math.min(bins.length - 1, Math.max(0, Math.floor((val - min) / binSize)));
      if (bins[bIdx]) bins[bIdx].base++;
    });

    simulatedValues.forEach(val => {
      const bIdx = Math.min(bins.length - 1, Math.max(0, Math.floor((val - min) / binSize)));
      if (bins[bIdx]) bins[bIdx].sim++;
    });
    
    return bins;
  }, [values, simulatedValues]);

  
  const runSimulation = async () => {
    setSimulating(true);
    setAiRecommendation(null);
    setSimResult(currentSimResult as any);

    try {
      const prompt = `As the AETHERION AI, analyze these simulation results:
      Old AQI: ${currentSimResult.oldAqi.toFixed(2)}
      New AQI: ${currentSimResult.newAqi.toFixed(2)}
      Improvement: ${currentSimResult.percentImprovement.toFixed(2)}%
      
      Provide a highly fast, tactical recommendation for a city with these metrics. Stay technical and mathematical. Keep it briefly under 50 words.`;

      const response = await aiApi.recommendation({ ...currentSimResult, context: prompt });
      setAiRecommendation(response.text);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // NEW Analytical Extractions for the Global Dashboard
  const topPolluted = useMemo(() => {
    return [...aqiData].sort((a, b) => b.value - a.value).slice(0, 20);
  }, [aqiData]);

  const focusedCityData = useMemo(() => {
    if (!focusedCityId) return null;
    return aqiData.find(d => d.id === focusedCityId);
  }, [aqiData, focusedCityId]);

  const highRiskCities = useMemo(() => {
    return aqiData.filter(d => d.value >= 200);
  }, [aqiData]);

  const recommendedActions = useMemo(() => {
    if (aqiData.length === 0) return [];
    const maxAqi = Math.max(...aqiData.map(d => d.value));
    
    const actions = [];
    if (maxAqi > 50) actions.push("Sensitive individuals should minimize heavy exertion.");
    if (maxAqi > 100) actions.push("General population: utilize N95 filtration during outdoor transit.");
    if (maxAqi > 200) actions.push("STRICT ADVISORY: Suspend all non-essential outdoor activity. Active masking required.");
    if (maxAqi > 300) actions.push("EMERGENCY PROTOCOL: Absolute indoor confinement. Industrial emission dampening required.");
    
    return actions;
  }, [aqiData]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-blue-500/30">
      <AnimatePresence>
        {showIntro && <IntroPage 
          onClose={() => setShowIntro(false)} 
          user={user}
          isAuthenticating={isAuthenticating}
          handleLogin={handleLogin}
          loginError={loginError}
        />}
      </AnimatePresence>
      {/* Header */}
      <header className="h-16 border-b border-[#222] flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowIntro(true)}>
          <div className="bg-blue-600 p-1.5 rounded-sm group-hover:bg-blue-500 transition-colors">
            <Wind size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tighter uppercase group-hover:text-blue-400 transition-colors">Aetherion</h1>
              {offlineStatus && (
                <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 border border-red-800 rounded font-mono uppercase tracking-widest animate-pulse">
                  OFFLINE Mode
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase -mt-1">Environmental Intelligence Unit</p>
          </div>
        </div>
        
        <nav className="flex gap-4">
          {[
            { id: 'dashboard', label: 'Monitor', icon: Globe },
            { id: 'decision-engine', label: 'Decision Engine', icon: Activity },
            { id: 'chat', label: 'AI Uplink', icon: Command },
            { id: 'deepthink', label: 'Deep Intel', icon: Brain }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors font-medium px-2 py-1 rounded",
                activeTab === tab.id ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 border-l border-[#222] pl-6">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full border border-[#444]" referrerPolicy="no-referrer" />
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-[10px] font-mono text-gray-400 hover:text-white uppercase tracking-widest"
              >
                Disconnect
              </button>
            </div>
          ) : null}

          <button 
            onClick={() => setShowGlobalGrid(!showGlobalGrid)}
            className={cn(
              "px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 border transition-all",
              showGlobalGrid 
                ? "bg-blue-600/30 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                : "bg-[#111] border-[#333] text-gray-500 hover:text-gray-300"
            )}
            title="Toggle Global Area Wash Grid"
          >
            <Globe size={14} className={cn(showGlobalGrid && "animate-pulse")} />
            {showGlobalGrid ? "Grid: Online" : "Grid: Halted"}
          </button>

          <div className="flex flex-col items-end">
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest leading-none mb-1">Telemetry Scope</span>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-tighter">Planetary Sweep Active</span>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showDisconnectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDisconnecting) setShowDisconnectConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="disconnect-title"
              aria-describedby="disconnect-description"
              className="w-full max-w-md rounded-lg border border-[#333] bg-[#111] shadow-2xl"
            >
              <div className="border-b border-[#2a2a2a] px-5 py-4">
                <p className="mb-1 text-[9px] font-mono uppercase tracking-[0.25em] text-red-400">Session Control</p>
                <h2 id="disconnect-title" className="text-lg font-semibold text-white">Disconnect from Aetherion?</h2>
              </div>
              <div className="px-5 py-4">
                <p id="disconnect-description" className="text-sm leading-relaxed text-gray-400">
                  Your current authenticated session will end and you will return to the authentication page.
                </p>
              </div>
              <div className="flex justify-end gap-3 border-t border-[#2a2a2a] px-5 py-4">
                <button
                  type="button"
                  disabled={isDisconnecting}
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="rounded border border-[#444] px-4 py-2 text-xs font-mono uppercase tracking-widest text-gray-300 transition-colors hover:bg-[#222] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDisconnecting}
                  onClick={handleDisconnect}
                  className="rounded border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-mono uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                >
                  {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {activeTab === 'chat' && (
           <div className="lg:col-span-12 max-w-4xl w-full mx-auto py-6">
             <Chatbot />
           </div>
        )}

        {activeTab === 'deepthink' && (
           <div className="lg:col-span-12 max-w-4xl w-full mx-auto py-6">
             <HighThinking />
           </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Left Column - Globe & Live Map */}
            <div className="lg:col-span-8 space-y-6">
              <Card title="Global AQI Distribution" className="h-[520px]" icon={Globe}>
                <AetherionMap 
                  data={aqiData} 
                  showGlobalGrid={showGlobalGrid}
                  showLethalOnly={showLethalOnly}
                  focusedCityId={focusedCityId}
                  setFocusedCityId={setFocusedCityId}
                />
              </Card>

              <Card title="Planetary Atmospheric Pulse" icon={Activity}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aqiData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="location" hide />
                      <YAxis stroke="#444" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '10px' }}
                        labelStyle={{ color: '#fff', marginBottom: '4px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Right Column - Station Data & Rankings */}
            <div className="lg:col-span-4 space-y-6">
              {/* Urban Focus Detail Panel */}
              <AnimatePresence>
                {focusedCityData && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="mb-6"
                  >
                    <Card title="Urban Focus Intelligence" icon={Target} className="border-blue-500/40 bg-blue-900/5">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-400">
                              {focusedCityData.city}
                            </h3>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                              Planetary Analytics Hub // {focusedCityData.country}
                            </p>
                          </div>
                          <div className="text-right">
                             <div className={cn(
                               "text-2xl font-mono font-black",
                               focusedCityData.value > 150 ? "text-red-500" : "text-green-500"
                             )}>
                               {focusedCityData.value.toFixed(0)}
                             </div>
                             <p className="text-[9px] text-gray-600 uppercase">Live AQI Index</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-2 bg-[#000]/40 rounded border border-[#222]">
                            <p className="text-[8px] text-gray-500 uppercase tracking-tighter mb-1">Global Variance</p>
                            <p className="text-sm font-mono font-bold text-gray-200">
                              {stats ? (focusedCityData.value - stats.mean).toFixed(1) : "0.0"}
                              <span className="text-[10px] ml-1 text-gray-600">pts</span>
                            </p>
                          </div>
                          <div className="p-2 bg-[#000]/40 rounded border border-[#222]">
                            <p className="text-[8px] text-gray-500 uppercase tracking-tighter mb-1">Pollution Rank</p>
                            <p className="text-sm font-mono font-bold text-gray-200">
                              #{[...aqiData].sort((a,b) => b.value - a.value).findIndex(d => d.id === focusedCityId) + 1}
                              <span className="text-[10px] ml-1 text-gray-600">of {aqiData.length}</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
                           <p className="text-[10px] text-blue-300 leading-relaxed font-medium italic">
                             Automated protocol suggest focused city "{focusedCityData.city}" is currently operating at {focusedCityData.value > (stats?.mean || 0) ? "above-average" : "below-average"} atmospheric toxicity thresholds.
                           </p>
                        </div>

                        <button 
                          onClick={() => setFocusedCityId(null)}
                          className="w-full py-2 bg-[#111] border border-[#222] text-[10px] uppercase font-bold tracking-widest hover:bg-blue-600 hover:text-white transition-all rounded"
                        >
                          Clear Tactical Focus
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Leaderboard Panel */}
              <Card title="Global Pollution Leaderboard" icon={AlertCircle}>
                <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="py-10 text-center text-gray-600 animate-pulse font-mono text-[9px] uppercase">Mapping Global Peaks...</div>
                  ) : topPolluted.map((node, i) => (
                    <button 
                      key={node.id} 
                      onClick={() => setFocusedCityId(node.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded border transition-all group",
                        focusedCityId === node.id ? "bg-blue-600/20 border-blue-500/50" : "bg-[#1a1a1a] border-transparent hover:border-red-500/30"
                      )}
                    >
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-gray-700 w-4">{i + 1}.</span>
                          <div className="flex flex-col text-left">
                             <span className={cn(
                               "text-[11px] font-bold group-hover:text-red-400 transition-colors uppercase leading-none mb-1",
                               focusedCityId === node.id ? "text-blue-400" : "text-gray-200"
                             )}>
                               {node.location || node.city}
                             </span>
                             <span className="text-[8px] text-gray-500 uppercase font-mono">{node.country} // {node.source}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className={cn(
                            "text-[12px] font-mono font-black",
                            node.value > 150 ? "text-red-500" : "text-green-500"
                          )}>{node.value.toFixed(0)}</span>
                          <span className="block text-[7px] text-gray-600 uppercase">Index.v5</span>
                       </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* High Risk Critical Panel */}
              <AnimatePresence>
                {highRiskCities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card title="Critical Health Advisory" icon={ShieldCheck} className="border-red-500/40 bg-red-900/5">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
                           <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                           <div>
                              <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-1">Hazardous Nodes Detected</p>
                              <p className="text-[10px] text-gray-300 leading-relaxed">
                                Persistent hazardous thresholds exceeded in {highRiskCities.length} monitored regions. Emergency masks and indoor containment protocols activated.
                              </p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-[9px] text-gray-500 uppercase font-mono tracking-widest mb-1">Hazard Leaderboard:</p>
                           {highRiskCities.slice(0, 4).map(city => (
                             <div key={city.id} className="flex justify-between items-center text-[10px] bg-[#000]/30 p-1.5 px-2 rounded border border-[#222]">
                                <span className="font-bold text-gray-200">{city.location}</span>
                                <div className="flex items-center gap-3">
                                   <span className="text-red-500 font-mono font-bold">{city.value.toFixed(0)}</span>
                                   <span className="px-1 py-0.5 bg-red-500/10 text-red-500 text-[8px] uppercase font-bold rounded">
                                     {city.value >= 300 ? "Hazardous" : "Severe"}
                                   </span>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggestions Panel */}
              <Card title="Recommended Protocols" icon={ShieldCheck}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {recommendedActions.length > 0 ? (
                      recommendedActions.map((action, i) => (
                        <div key={i} className="flex gap-3 items-start p-3 bg-[#111] border border-[#222] rounded hover:border-blue-500/30 transition-all">
                           <ShieldCheck size={14} className="text-blue-500 shrink-0 mt-0.5" />
                           <p className="text-[11px] leading-relaxed text-gray-300">{action}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center border border-dashed border-[#222] rounded">
                         <ShieldCheck size={20} className="text-gray-700 mx-auto mb-2" />
                         <p className="text-[10px] text-gray-600 font-mono uppercase">Optimized Air Quality: Standard Operations</p>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-[#222]" />
                  
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 uppercase tracking-tighter">AI Advisory Confidence</span>
                    <span className="font-mono text-blue-400">0.962α</span>
                  </div>
                </div>
              </Card>

              <Card title="Planetary Insights" icon={Brain}>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-sm self-start">
                      <Info size={14} className="text-blue-500" />
                    </div>
                    <div className="text-[11px] leading-relaxed text-gray-400">
                      The <span className="text-blue-400">Aetherion Engine</span> detects a {stats && stats.skewness > 0 ? "positive skew" : "negative skew"} in global AQI distributions. This suggests {stats && stats.skewness > 0 ? "isolated high-pollution hotspots" : "broad areas of atmospheric stability"} across the tracked planetary hubs.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'decision-engine' && <DecisionEngine aqiData={aqiData} lastSync={lastAqiSync} />}

      </main>

      <footer className="mt-20 border-t border-[#222] p-6 text-center">
        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.4em]">
          AETHERION // v1.0.4-BETA // NODE_ID::AIS_CORE_SEA_1
        </p>
      </footer>

      {/* Grid Overlay for atmosphere */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
