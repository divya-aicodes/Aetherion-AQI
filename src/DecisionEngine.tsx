import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { cn } from './lib/utils';
import { AQIData } from './types';
import { STRATEGIES } from './lib/strategies';
import { AlertCircle } from 'lucide-react';

const COUNTRIES = ['India', 'China', 'USA', 'UK', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'Pakistan'];

const countryCodes: Record<string, string> = {
  "India": "IN",
  "China": "CN", 
  "USA": "US",
  "UK": "GB",
  "Germany": "DE",
  "France": "FR",
  "Japan": "JP",
  "Australia": "AU",
  "Brazil": "BR",
  "Pakistan": "PK"
};

export const Card = ({ children, className, title, icon: Icon }: any) => (
  <div className={cn("bg-[#141414] border border-[#333] rounded-lg overflow-hidden flex flex-col", className)}>
    {title && (
      <div className="px-4 py-2 border-b border-[#333] flex items-center justify-between bg-[#1a1a1a]">
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

export default function DecisionEngine({ aqiData, lastSync }: { aqiData: AQIData[]; lastSync: string | null }) {
  const [deData, setDeData] = React.useState<AQIData[]>(aqiData);
  const [selectedCountry, setSelectedCountry] = React.useState<string>('');

  React.useEffect(() => {
    if (!selectedCountry) setDeData(aqiData);
  }, [aqiData, selectedCountry]);

  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    if (!country) {
      setDeData(aqiData);
      return;
    }

    setDeData(aqiData.filter(item => item.country === country).sort((a, b) => b.value - a.value));
  };

  const [policy, setPolicy] = useState({ car: 0, transit: 0, industry: 0, renewable: 0 });
  const [activeStratId, setActiveStratId] = useState<string>('');

  const liveVals = deData.map(c => c.value);
  const n = liveVals.length;
  
  const getStats = (vals: number[]) => {
    if (vals.length === 0) return { mean: 0, median: 0, variance: 0, std: 0, skewness: 0, kurtosis: 0 };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = vals.length % 2 === 0
      ? (sorted[vals.length / 2 - 1] + sorted[vals.length / 2]) / 2
      : sorted[Math.floor(vals.length / 2)];
    const variance = vals.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    const skewness = std > 0 ? 3 * (mean - median) / std : 0;
    const nForK = vals.length;
    let kurtosis = 0;
    if (variance > 0 && nForK > 0) {
      kurtosis = (vals.reduce((s, x) => s + Math.pow(x - mean, 4), 0) / nForK) / Math.pow(variance, 2) - 3;
    }
    return { mean, median, variance, std, skewness, kurtosis };
  };

  const liveStats = getStats(liveVals);
  const liveOutliers = deData.filter(c => c.value > liveStats.mean + 2 * liveStats.std);

  const R_base = (policy.car * 0.30 + policy.transit * 0.25 + policy.industry * 0.30 + policy.renewable * 0.15) / 100;
  
  const activeStrat = STRATEGIES.find(s => s.id === activeStratId);
  // Using exact modifier or average of range
  const multiplier = activeStrat ? 1 + ((activeStrat.modifierRange[0] + activeStrat.modifierRange[1]) / 2) : 1;
  const R_final = Math.min(1, R_base * multiplier);

  const projectedVals = liveVals.map(val => Math.max(0, val * (1 - R_final)));
  const projStats = getStats(projectedVals);
  const projOutliers = deData.map((c, i) => ({ ...c, projected: projectedVals[i] })).filter(c => c.projected > projStats.mean + 2 * projStats.std);

  const bestStrat = [...STRATEGIES].sort((a, b) => {
    const multA = 1 + (a.modifierRange[0] + a.modifierRange[1]) / 2;
    const multB = 1 + (b.modifierRange[0] + b.modifierRange[1]) / 2;
    return multB - multA;
  })[0];

  const handleLockdown = () => {
    setPolicy({ car: 100, transit: 100, industry: 100, renewable: 100 });
    setActiveStratId(bestStrat.id);
  };

  const getRiskColor = (aqi: number) => {
    if (aqi < 100) return 'text-green-500';
    if (aqi < 200) return 'text-yellow-500';
    if (aqi < 300) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRiskLabel = (aqi: number) => {
    if (aqi < 100) return 'GOOD';
    if (aqi < 200) return 'MODERATE';
    if (aqi < 300) return 'UNHEALTHY';
    return 'HAZARDOUS';
  };

  const getSkewLabel = (sk: number) => {
    if (sk > 1) return 'Right skewed — outliers pulling mean';
    if (sk < -1) return 'Left skewed — majority polluted';
    return 'Near symmetric';
  };

  const getKurtLabel = (k: number) => {
    if (k > 1) return 'LEPTOKURTIC — extreme spikes frequent';
    if (k < -1) return 'PLATYKURTIC — spread evenly';
    return 'MESOKURTIC — normal';
  };
  
  const getKurtShape = (k: number) => {
    if (k > 1) return 'LEPTOKURTIC';
    if (k < -1) return 'PLATYKURTIC';
    return 'MESOKURTIC';
  };

  const numBins = 20;
  const maxVal = Math.max(...liveVals, 100);
  const binWidth = maxVal / numBins;
  
  const hData = Array.from({ length: numBins }).map((_, i) => {
    const minD = i * binWidth;
    const maxD = minD + binWidth;
    const liveCount = liveVals.filter(v => v >= minD && v < maxD).length;
    const projCount = projectedVals.filter(v => v >= minD && v < maxD).length;
    return { bin: `${Math.floor(minD)}`, live: liveCount, proj: projCount, mid: minD + binWidth/2 };
  });

  const getPdf = (x: number, mean: number, std: number) => {
    if (std === 0) return 0;
    const exp = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(std, 2)));
    return (1 / (std * Math.sqrt(2 * Math.PI))) * exp;
  };

  const curveData = Array.from({ length: 50 }).map((_, i) => {
    const x = (maxVal / 50) * i;
    return {
      x,
      liveNorm: getPdf(x, liveStats.mean, liveStats.std) * n * binWidth,
      projNorm: getPdf(x, projStats.mean, projStats.std) * n * binWidth,
    };
  });

  const sortedData = [...deData].sort((a, b) => b.value - a.value);

  const StatPanel = ({ title, bg, stats, isProj, baseStats }: any) => {
    const diff = isProj && baseStats ? (stats.mean - baseStats.mean).toFixed(1) : null;
    const pct = isProj && baseStats && baseStats.mean > 0 ? (((baseStats.mean - stats.mean) / baseStats.mean) * 100).toFixed(1) : null;
    return (
      <div className={`space-y-4 ${bg} p-4 rounded-lg border border-[#333]`}>
        <h3 className="text-sm font-bold font-serif mb-4 flex justify-between items-center text-white">
          {title}
        </h3>
        
        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">μ = Σx / n</span>
             <span className="uppercase text-gray-400 font-bold">MEAN</span>
           </div>
           <p className="text-2xl font-bold text-gray-200">{stats.mean.toFixed(1)}</p>
           <p className="text-[10px] text-gray-500">Average across {n} live cities</p>
           {isProj && baseStats && (
             <p className={`text-[10px] font-bold ${stats.mean < baseStats.mean ? 'text-green-500' : 'text-red-500'}`}>
               {baseStats.mean.toFixed(1)} → {stats.mean.toFixed(1)} ▼{Math.abs(baseStats.mean - stats.mean).toFixed(1)} ({pct}%)
             </p>
           )}
        </div>

        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">middle of sorted</span>
             <span className="uppercase text-gray-400 font-bold">MEDIAN</span>
           </div>
           <p className="text-2xl font-bold text-gray-200">{stats.median.toFixed(1)}</p>
           <p className="text-[10px] text-gray-500">Gap: μ - median = {(stats.mean - stats.median).toFixed(1)}</p>
           {(stats.mean - stats.median) > 200 && <p className="text-[10px] text-red-500 font-bold mt-1">OUTLIER DISTORTION</p>}
        </div>

        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">σ² = Σ(x-μ)² / n</span>
             <span className="uppercase text-gray-400 font-bold">VARIANCE</span>
           </div>
           <p className="text-xl font-bold text-gray-300">{stats.variance.toFixed(1)}</p>
           <p className="text-[10px] text-gray-500">Spread of pollution data</p>
        </div>

        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">σ = √(Σ(x-μ)²/n)</span>
             <span className="uppercase text-gray-400 font-bold">STD DEVIATION</span>
           </div>
           <p className="text-xl font-bold text-gray-300">{stats.std.toFixed(1)}</p>
           <p className="text-[10px] text-gray-500">Outliers: {isProj ? projOutliers.map(o=>o.city).join(', ') : liveOutliers.map(o=>o.city).join(', ')}</p>
        </div>

        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">Sk = 3(μ - Median) / σ</span>
             <span className="uppercase text-gray-400 font-bold">SKEWNESS</span>
           </div>
           <p className="text-xl font-bold text-gray-200">{stats.skewness.toFixed(3)}</p>
           <p className="text-[9px] text-gray-600 font-mono">3 × ({stats.mean.toFixed(0)} - {stats.median.toFixed(0)}) ÷ {stats.std.toFixed(1)} = {stats.skewness.toFixed(3)}</p>
           <p className={`text-[10px] mt-1 ${stats.skewness > 1 ? 'text-red-400' : stats.skewness < -1 ? 'text-blue-400' : 'text-green-400'}`}>{getSkewLabel(stats.skewness)}</p>
        </div>

        <div className="bg-[#111] p-3 rounded border border-[#222]">
           <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
             <span className="font-mono">β₂ = [Σ(x-μ)⁴/n] / σ⁴ - 3</span>
             <span className="uppercase text-gray-400 font-bold">KURTOSIS</span>
           </div>
           <p className="text-xl font-bold text-gray-200">{stats.kurtosis.toFixed(3)}</p>
           <p className={`text-[10px] mt-1 ${stats.kurtosis > 1 ? 'text-purple-400' : stats.kurtosis < -1 ? 'text-blue-400' : 'text-gray-400'}`}>{getKurtLabel(stats.kurtosis)}</p>
        </div>
        
        <div className="space-y-4 pt-4">
          <div className="bg-[#0a0a0a] p-2 rounded h-40">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={isProj ? hData : hData}>
                 <XAxis dataKey="bin" hide />
                 <Bar dataKey={isProj ? "proj" : "live"} fill={isProj ? "#10b981" : "#3b82f6"} isAnimationActive={false} />
               </BarChart>
             </ResponsiveContainer>
          </div>
          <div className="bg-[#0a0a0a] p-2 rounded h-40 relative">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={curveData}>
                 <XAxis dataKey="x" hide />
                 <Area type="monotone" dataKey={isProj ? "projNorm" : "liveNorm"} stroke="#ef4444" fill={isProj ? "#10b981" : "#ef4444"} fillOpacity={0.1} isAnimationActive={false} />
                 {isProj && <Area type="monotone" dataKey="liveNorm" stroke="#3b82f6" fill="none" strokeDasharray="5 5" isAnimationActive={false} />}
                 <ReferenceLine x={stats.mean} stroke="#3b82f6" strokeDasharray="5 5" />
                 <ReferenceLine x={stats.median} stroke="#22c55e" strokeDasharray="5 5" />
               </AreaChart>
             </ResponsiveContainer>
             <span className="absolute top-2 right-2 text-[8px] font-mono text-gray-500 uppercase">{getKurtShape(stats.kurtosis)}</span>
          </div>
        </div>
      </div>
    );
  };

  const isTragedy = activeStratId === 'always-defect' || activeStratId === 'reverse-tft';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 lg:col-span-12">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-[#00ff00] uppercase tracking-[0.2em] leading-none mt-0.5 ml-1 border border-[#00ff00]/30 px-2 py-1 bg-[#00ff00]/10 rounded-sm">TRUE RESULTS ACTIVE</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono italic">
            {n} current readings • Last sync {lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'pending'} • Refreshes every 5 min
          </span>
        </div>
        
        <div className="max-h-60 overflow-y-auto custom-scrollbar border border-[#222] rounded bg-[#050505]">
          <table className="w-full text-left text-[11px] font-mono text-gray-400">
            <thead className="sticky top-0 bg-[#0a0a0a] border-b border-[#222] text-gray-500">
              <tr>
                <th className="py-3 px-4 font-serif italic text-[11px] uppercase tracking-wider text-gray-500/80">Rank</th>
                <th className="py-3 px-4 font-serif italic text-[11px] uppercase tracking-wider text-gray-500/80">City</th>
                <th className="py-3 px-4 font-serif italic text-[11px] uppercase tracking-wider text-gray-500/80">Live AQI</th>
                <th className="py-3 px-4 font-serif italic text-[11px] uppercase tracking-wider text-gray-500/80">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((d, i) => (
                <tr key={d.id} className="border-b border-[#111] hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-default">
                  <td className="py-2.5 px-4 font-normal">#{i+1}</td>
                  <td className="py-2.5 px-4 font-bold text-gray-300">{d.city}</td>
                  <td className={`py-2.5 px-4 font-bold ${getRiskColor(d.value)}`}>{d.value.toFixed(1)}</td>
                  <td className={`py-2.5 px-4 text-[10px] tracking-widest ${getRiskColor(d.value)}`}>{getRiskLabel(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatPanel title="BASELINE — LIVE AQI" bg="bg-[#050505]" stats={liveStats} isProj={false} />

        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 space-y-6">
            <h3 className="text-sm font-bold font-serif text-white">CONTROLS</h3>
            
            <div className="space-y-4">
              {[
                { id: 'car', label: 'Car Usage Reduction', val: policy.car },
                { id: 'transit', label: 'Transit Adoption', val: policy.transit },
                { id: 'industry', label: 'Industrial Curb', val: policy.industry },
                { id: 'renewable', label: 'Renewable Energy', val: policy.renewable },
              ].map(p => (
                <div key={p.id} className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-mono tracking-tighter text-gray-400">
                    <span>{p.label}</span>
                    <span className="text-blue-400">{p.val}%</span>
                  </div>
                  <div className="relative h-2 bg-[#111] border border-[#333] rounded-sm overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all" style={{ width: `${p.val}%` }} />
                    <input 
                      type="range" min="0" max="100" value={p.val}
                      onChange={(e) => setPolicy(prev => ({ ...prev, [p.id]: parseInt(e.target.value) }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
              <div className="text-[10px] font-mono text-gray-500 text-right">
                Base Policy: {(R_base*100).toFixed(1)}%
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-mono tracking-widest text-gray-500">STRATEGY SELECTOR</h4>
              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {STRATEGIES.map(strat => (
                  <button
                    key={strat.id}
                    onClick={() => setActiveStratId(strat.id)}
                    className={`w-full text-left p-2 rounded border text-[10px] font-mono transition-all ${activeStratId === strat.id ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-[#111] border-[#222] text-gray-500 hover:border-[#444]'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="uppercase tracking-tighter">{strat.name}</span>
                      <span className="text-gray-600">×{(1 + (strat.modifierRange[0]+strat.modifierRange[1])/2).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111] p-3 border border-[#333] rounded mt-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Live Computation</p>
              <p className="text-[11px] text-gray-300 font-mono mb-1">Strategy: {activeStrat?.name || 'None'}</p>
              <p className="text-[11px] text-gray-400 font-mono">Base: {(R_base*100).toFixed(1)}%</p>
              <p className="text-[11px] text-gray-400 font-mono">Multiplier: ×{multiplier.toFixed(2)}</p>
              <div className="h-px bg-[#333] my-2 w-full" />
              <p className="text-[11px] text-green-400 font-mono font-bold">Final Reduction: {(R_final*100).toFixed(1)}%</p>
              <p className="text-[11px] text-gray-300 font-mono mt-1">Live Mean: {liveStats.mean.toFixed(1)} → {projStats.mean.toFixed(1)}</p>
              {liveStats.mean > 0 && <p className={`text-[10px] font-mono mt-1 ${isTragedy ? 'text-red-400' : 'text-green-400'}`}>▼ {Math.abs(liveStats.mean - projStats.mean).toFixed(1)} points ({((Math.abs(liveStats.mean - projStats.mean) / liveStats.mean) * 100).toFixed(1)}%)</p>}
            </div>

            <button 
              onClick={handleLockdown}
              className="mt-4 w-full py-3 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 text-red-500 text-[10px] font-bold font-mono uppercase tracking-[0.2em] rounded flex items-center justify-center gap-2 transition-all"
            >
              <AlertCircle size={14} /> ZERO EMISSIONS LOCKDOWN
            </button>
            <p className="text-[9px] text-center text-gray-600 mt-2 font-mono">All sliders to 100%. Best strategy applied.</p>
          </div>
        </div>

        <div className="space-y-4">
          {getKurtShape(liveStats.kurtosis) !== getKurtShape(projStats.kurtosis) && (
            <div className="bg-blue-500/10 border border-blue-500/50 p-3 rounded mb-2">
               <p className="text-[10px] font-mono uppercase text-blue-400 font-bold mb-1">DISTRIBUTION SHIFTED</p>
               <p className="text-xs text-blue-300">{getKurtShape(liveStats.kurtosis)} → {getKurtShape(projStats.kurtosis)}</p>
               <p className="text-[9px] text-blue-500/80 uppercase mt-1 tracking-tighter">Strategy restructuring pollution pattern</p>
            </div>
          )}
          {isTragedy && (
            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded mb-2">
               <p className="text-[10px] font-mono uppercase text-red-400 font-bold mb-1">WARNING: DEFECTION WORSENS AQI</p>
               <p className="text-[9px] text-red-500/80 uppercase mt-1 tracking-tighter">Strategy causes pollution to increase</p>
            </div>
          )}
          <StatPanel title="POST-INTERVENTION PROJECTION" bg="bg-[#051111]" stats={projStats} isProj={true} baseStats={liveStats} />
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 overflow-x-auto">
         <h4 className="text-sm font-bold font-serif text-white mb-4">STATISTICAL REASONING ENGINE</h4>
         <table className="w-full text-left text-[11px] font-mono text-gray-400 min-w-[700px]">
            <thead className="border-b border-[#222] text-[9px] text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="pb-3 px-2 font-normal">Stat</th>
                <th className="pb-3 px-2 font-normal">Formula</th>
                <th className="pb-3 px-2 font-normal">Live</th>
                <th className="pb-3 px-2 font-normal">Projected</th>
                <th className="pb-3 px-2 font-normal">Delta</th>
                <th className="pb-3 px-2 font-normal">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'MEAN', f: 'μ=Σx/n', l: liveStats.mean, p: projStats.mean, d: liveStats.mean - projStats.mean, int: 'Central tendency' },
                { name: 'MEDIAN', f: 'middle', l: liveStats.median, p: projStats.median, d: liveStats.median - projStats.median, int: 'Robust measure' },
                { name: 'VARIANCE', f: 'σ²=Σ(x-μ)²/n', l: liveStats.variance, p: projStats.variance, d: liveStats.variance - projStats.variance, int: 'Pollution inequality' },
                { name: 'STD DEV', f: 'σ=√σ²', l: liveStats.std, p: projStats.std, d: liveStats.std - projStats.std, int: `${liveOutliers.length} outlier cities` },
                { name: 'SKEWNESS', f: '3(μ-m)/σ', l: liveStats.skewness, p: projStats.skewness, d: liveStats.skewness - projStats.skewness, int: 'Distribution shape' },
                { name: 'KURTOSIS', f: 'β₂-3', l: liveStats.kurtosis, p: projStats.kurtosis, d: liveStats.kurtosis - projStats.kurtosis, int: 'Spike frequency' },
              ].map(r => {
                const isBetter = r.d > 0;
                const pctChange = r.l !== 0 ? Math.abs((r.d / Math.abs(r.l)) * 100) : 0;
                let statusColor = 'text-gray-400';
                if (pctChange < 5) statusColor = 'text-yellow-500';
                else if (isBetter && !isTragedy) statusColor = 'text-green-500';
                else statusColor = 'text-red-500';

                return (
                  <tr key={r.name} className="border-b border-[#111] hover:bg-[#111]">
                    <td className="py-3 px-2 font-bold text-gray-200">{r.name}</td>
                    <td className="py-3 px-2 text-gray-600">{r.f}</td>
                    <td className="py-3 px-2">{r.l.toFixed(2)}</td>
                    <td className="py-3 px-2">{r.p.toFixed(2)}</td>
                    <td className={`py-3 px-2 font-bold ${statusColor}`}>
                      {r.d > 0 ? '▼' : '▲'} {Math.abs(r.d).toFixed(2)} ({pctChange.toFixed(1)}%)
                    </td>
                    <td className="py-3 px-2 text-gray-500 uppercase tracking-tighter text-[9px]">{r.int}</td>
                  </tr>
                );
              })}
            </tbody>
         </table>
      </div>

      <div className="bg-[#050505] border border-[#222] border-l-4 border-l-blue-500 rounded p-4 font-mono">
         <h4 className="text-[10px] text-blue-400 uppercase tracking-widest mb-3">INTELLIGENCE SUMMARY</h4>
         <div className="text-xs text-gray-400 leading-relaxed space-y-4">
           {liveStats.mean > 0 ? (
           <>
             <p>
               LIVE DATA: {n} cities, mean AQI {liveStats.mean.toFixed(1)}. 
               Distribution is {getSkewLabel(liveStats.skewness).toLowerCase()} (Sk={liveStats.skewness.toFixed(2)}). 
               Kurtosis {liveStats.kurtosis.toFixed(2)} = {getKurtShape(liveStats.kurtosis)}. 
               {liveOutliers.length} outlier cities beyond 2σ.
             </p>
             <p>
               INTERVENTION: {activeStrat?.name || 'Base policy'} applied. 
               Policy strength {(R_final*100).toFixed(1)}%. 
               Projected mean {isTragedy ? 'RISES' : 'DROPS'} to {projStats.mean.toFixed(1)} 
               — {((Math.abs(liveStats.mean - projStats.mean) / liveStats.mean) * 100).toFixed(1)}% {isTragedy ? 'deterioration' : 'improvement'} over live data. 
               Distribution {getKurtShape(liveStats.kurtosis) !== getKurtShape(projStats.kurtosis) ? 'CHANGED' : 'UNCHANGED'}.
             </p>
             <p className="text-gray-200 font-bold uppercase mt-2">
               RECOMMENDATION: <br/>
               {isTragedy ? <span className="text-red-400">WARNING - WITHDRAW STRATEGY IMMEDIATELY</span> : 
                R_final > 0.6 ? <span className="text-green-400">POLICY INTENSITY SUFFICIENT</span> : 
                R_final > 0.3 ? <span className="text-yellow-400">INCREASE INDUSTRIAL CURB OR TRANSIT</span> : 
                <span className="text-red-400">INSUFFICIENT — USE ZERO EMISSIONS LOCKDOWN</span>}
             </p>
           </>
           ) : (
             <p>WAITING FOR LIVE TELEMETRY...</p>
           )}
         </div>
      </div>
      
    </div>
  );
}
