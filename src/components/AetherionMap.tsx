import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';
import { AlertTriangle, MapPin, Activity, Search, Target, X, Skull } from 'lucide-react';
import { AQIData } from '../types';
import { getAqiCategory } from '../lib/aqi';

interface MapProps {
  data: AQIData[];
  showGlobalGrid: boolean;
  showLethalOnly: boolean;
  focusedCityId: string | null;
  setFocusedCityId: (id: string | null) => void;
}

// AQI Helpers
const getAQIColor = (aqi: number) => getAqiCategory(aqi).color;
const getAQICategory = (value: number) => { const category = getAqiCategory(value); return { label: category.label, risk: category.advisory }; };

// Map Navigation Controller
const MapController = ({ target }: { target: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 8, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [target, map]);
  return null;
};

const AetherionMap: React.FC<MapProps> = ({ 
  data,
  showGlobalGrid,
  showLethalOnly,
  focusedCityId,
  setFocusedCityId
}) => {
  // India Focus Default for better regional feedback
  const center: [number, number] = [20.5937, 78.9629]; 
  const [searchQuery, setSearchQuery] = useState('');
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null);

  const focusedNode = useMemo(() => {
    if (!focusedCityId) return null;
    return data.find(d => d.id === focusedCityId) || null;
  }, [data, focusedCityId]);
  
  // High-Risk Intelligence Extraction
  const riskyNodes = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value).slice(0, 15);
  }, [data]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return [];
    return data
      .filter(item => 
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 10);
  }, [data, searchQuery]);

  const topPollutedIds = useMemo(() => {
    return new Set(riskyNodes.slice(0, 10).map(n => n.id));
  }, [riskyNodes]);

  const urbanVisualization = useMemo(() => {
    const layers: React.ReactNode[] = [];

    data.forEach((item) => {
      if (!item.coordinates || typeof item.coordinates.latitude !== 'number') return;
      
      const isLethal = item.value >= 400;
      const isFocused = focusedCityId === item.id;
      const isTopPolluted = topPollutedIds.has(item.id);

      // 1. Mandatory Visibility Check
      let isVisible = false;
      if (isFocused || isTopPolluted) {
        isVisible = true;
      } else if (showGlobalGrid) {
        if (showLethalOnly) {
          if (isLethal) isVisible = true;
        } else {
          isVisible = true;
        }
      }

      const baseColor = getAQIColor(item.value);
      const category = getAQICategory(item.value);

      // LAYER 1: The 'Dots' (Atmospheric Nodes)
      // Small 5km dots representing the planetary sweep telemetry
      if (showGlobalGrid) {
        layers.push(
          <Circle
            key={`dot-${item.id}`}
            center={[item.coordinates.latitude, item.coordinates.longitude]}
            radius={5000}
            pathOptions={{
              color: baseColor,
              fillColor: baseColor,
              fillOpacity: 0.2,
              weight: 0.5,
              stroke: true,
            }}
            interactive={false}
          />
        );
      }

      // LAYER 2: Urban Area Fills (The 'Colored Cities')
      // Large high-intensity fills with 'child-like' vivid coloring of city borders
      if (isVisible) {
        // Boosted radiuses: 25km base, 35km top-polluted, 60km focused
        const urbanRadius = isFocused ? 60000 : (isTopPolluted ? 35000 : 25000); 

        layers.push(
          <Circle
            key={`urban-${item.id}`}
            center={[item.coordinates.latitude, item.coordinates.longitude]}
            radius={urbanRadius}
            eventHandlers={{
              click: () => {
                setFocusedCityId(item.id);
                setMapTarget([item.coordinates.latitude, item.coordinates.longitude]);
              }
            }}
            pathOptions={{
              color: isLethal ? "#4c0519" : baseColor,
              fillColor: isLethal ? "#7f1d1d" : baseColor,
              fillOpacity: isFocused ? 0.95 : (isLethal ? 0.7 : 0.5),
              weight: isFocused ? 4 : 1,
              stroke: true,
            }}
            className={cn(
              "urban-border-fill",
              isFocused && "city-focus-colored",
              isLethal && "lethal-zone-colored"
            )}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="bg-[#0a0a0a] text-white p-3 rounded border border-[#333] shadow-2xl font-sans min-w-[220px]">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#222]">
                  <div className="text-[8px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1">
                     {isLethal ? <Skull size={10} className="text-purple-500 animate-bounce" /> : (isTopPolluted ? <AlertTriangle size={10} className="text-red-500 animate-pulse" /> : <Activity size={10} />)} 
                     {isLethal ? "Extinction Cluster" : (isTopPolluted ? "Critical Anomaly" : "Sensor Telemetry")}
                  </div>
                  <div className="text-[7px] font-mono text-gray-600 uppercase">HUB: {item.country || "Global"}</div>
                </div>
                
                <div className="font-bold text-[12px] mb-2 text-white/90">{item.location}</div>
                
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex flex-col">
                     <span className="text-[7px] text-gray-500 uppercase font-mono">AQI Index</span>
                     <span className={cn(
                       "text-xl font-bold font-mono tracking-tighter",
                       item.value > 150 ? "text-red-500" : item.value > 50 ? "text-yellow-400" : "text-green-400"
                     )}>
                       {item.value.toFixed(1)}
                     </span>
                  </div>
                  <div className="text-[9px] text-gray-300 uppercase font-bold text-right leading-tight max-w-[80px]">
                    {category.label}
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-900/40 p-2 rounded mb-2">
                  <div className="text-[8px] font-bold text-red-400 uppercase mb-1">Health Advisory:</div>
                  <div className="text-[9px] text-gray-400 leading-tight italic">
                    {category.risk}
                  </div>
                </div>

                <div className="mt-1 pt-1 border-t border-[#222] flex items-center justify-between text-[7px] font-mono text-gray-600 uppercase">
                  <span>Ref: {item.source}</span>
                  <span>Sync {new Date(item.lastUpdated).toLocaleTimeString()}</span>
                </div>
              </div>
            </Tooltip>
          </Circle>
        );
      }
    });

    return layers;
  }, [data, focusedCityId, topPollutedIds, showGlobalGrid, showLethalOnly]);

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-[#222] bg-[#0d1117] flex">
      {/* Side Control Panel */}
      <div className="w-64 border-r border-[#222] bg-[#0a0a0a] flex flex-col z-[1001]">
        <div className="p-4 border-b border-[#222]">
          <div className="flex items-center gap-2 mb-4">
            <Search size={14} className="text-blue-500" />
            <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-300">Node Search</h3>
          </div>
          
          <div className="relative">
            <input 
              type="text"
              placeholder="Locate City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded px-8 py-2 text-[11px] font-mono text-gray-300 placeholder:text-gray-700 focus:outline-none border-blue-500/50 transition-all"
            />
            <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
            {searchQuery && (
              <X 
                size={10} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hover:text-white" 
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          {filteredNodes.length > 0 && (
            <div className="absolute left-4 right-4 mt-2 bg-[#111] border border-[#333] rounded shadow-2xl overflow-hidden z-[1002]">
              {filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => {
                    setMapTarget([node.coordinates.latitude, node.coordinates.longitude]);
                    setFocusedCityId(node.id);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#1a1a1a] transition-all text-left group border-b border-[#222] last:border-0"
                >
                  <Target size={12} className="text-blue-500 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col flex-1 truncate">
                    <span className="text-[10px] font-bold text-gray-300 flex items-center gap-2">
                       {node.location}
                       {node.value >= 400 && <Skull size={10} className="text-purple-500 animate-pulse" />}
                    </span>
                    <span className="text-[7px] text-gray-600 uppercase font-mono">{node.source} // {node.value.toFixed(0)} AQI</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          {focusedNode ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-500" />
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-300">Focused Node</h3>
                </div>
                <button onClick={() => setFocusedCityId(null)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div>
                   <div className="text-[18px] font-bold text-white mb-1 leading-tight">{focusedNode.location}</div>
                   <div className="text-[10px] font-mono text-gray-500 uppercase">{focusedNode.country || 'Global Site'}</div>
                </div>

                <div className="bg-[#111] border border-[#222] rounded p-3">
                  <div className="text-[8px] text-gray-500 uppercase font-mono mb-1">Current Index</div>
                  <div className={cn(
                    "text-3xl font-black font-mono tracking-tighter",
                    focusedNode.value > 150 ? "text-red-500" : focusedNode.value > 50 ? "text-yellow-400" : "text-green-400"
                  )}>
                    {focusedNode.value.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                    {getAQICategory(focusedNode.value).label}
                  </div>
                </div>

                <div className="bg-[#111] border border-[#222] rounded p-3">
                  <div className="text-[8px] text-gray-500 uppercase font-mono mb-2">Coordinates</div>
                  <div className="text-[10px] text-blue-400 font-mono">
                    LAT: {focusedNode.coordinates.latitude.toFixed(4)}<br/>
                    LNG: {focusedNode.coordinates.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                  <div className="text-[8px] text-blue-400 uppercase font-mono mb-1">Node Status</div>
                  <div className="text-[10px] text-gray-300 italic">
                    {getAQICategory(focusedNode.value).risk}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-300">Hazard Detection</h3>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {riskyNodes.map((node) => (
                  <div 
                    key={node.id} 
                    onClick={() => {
                      setMapTarget([node.coordinates.latitude, node.coordinates.longitude]);
                      setFocusedCityId(node.id);
                    }}
                    className={cn(
                      "bg-[#111] border border-[#222] p-3 rounded hover:border-red-500/30 transition-all cursor-crosshair group active:scale-[0.98]",
                      focusedCityId === node.id && "border-blue-500/50 bg-blue-500/5 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-mono text-gray-600 uppercase">Alert Critical</span>
                      <span className={cn(
                        "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded",
                        node.value > 150 ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-400"
                      )}>
                        {node.value.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-300 mb-1 group-hover:text-white truncate">{node.location}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map Surface */}
      <div className="flex-1 relative">
        <MapContainer 
          center={center} 
          zoom={2} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', background: '#0d1117' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="topright" />
          <MapController target={mapTarget} />
          {urbanVisualization}
        </MapContainer>

        {/* Dynamic Legend */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-[#0a0a0a]/90 backdrop-blur-md border border-[#333] p-3 rounded-lg shadow-2xl min-w-[140px]">
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-2 border-b border-[#222] pb-1">Index Spectrum</div>
          <div className="space-y-1.5">
            {[
              { label: 'Good', color: '#10b981' },
              { label: 'Moderate', color: '#fbbf24' },
              { label: 'Unhealthy', color: '#ef4444' },
              { label: 'Severe', color: '#a855f7' },
              { label: 'Hazard', color: '#7f1d1d' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[8px] text-gray-400 uppercase font-mono">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .urban-border-fill {
          transition: all 0.5s ease-in-out;
        }
        .city-focus-colored {
          filter: brightness(1.2) drop-shadow(0 0 10px currentColor);
          animation: focus-pulsate 2s infinite alternate ease-in-out;
          z-index: 1000 !important;
        }
        @keyframes focus-pulsate {
          from { fill-opacity: 0.8; scale: 1; }
          to { fill-opacity: 1; scale: 1.05; }
        }
        .lethal-zone-colored {
          animation: alert-flash 1s infinite alternate;
        }
        @keyframes alert-flash {
          from { fill-opacity: 0.4; stroke-width: 1; }
          to { fill-opacity: 0.9; stroke-width: 4; }
        }
      `}</style>
    </div>
  );
};

export default AetherionMap;
