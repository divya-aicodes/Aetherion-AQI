import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Activity, Award, Check, Clock3, Loader2, MapPin, Search, Sparkles, TrendingDown, TrendingUp, Wind, X } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { getAqiCategory } from '../lib/aqi';
import type { AQIData, AqiForecastPoint } from '../types';

const SUGGESTED_CITIES = ['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur'];

type ForecastState = Record<string, { loading: boolean; points: AqiForecastPoint[]; error?: boolean }>;

function metrics(points: AqiForecastPoint[]) {
  if (!points.length) return null;
  const average = Math.round(points.reduce((sum, point) => sum + point.aqi, 0) / points.length);
  const peak = points.reduce((best, point) => point.aqi > best.aqi ? point : best);
  const lowest = points.reduce((best, point) => point.aqi < best.aqi ? point : best);
  const change = Math.round(points[points.length - 1].aqi - points[0].aqi);
  return { average, peak, lowest, change };
}

function Badge({ value }: { value: number }) {
  const category = getAqiCategory(value);
  return <span className="aqi-badge" style={{ color: category.color, borderColor: `${category.color}55`, background: `${category.color}12` }}>{category.label}</span>;
}

export default function CityCompare({ data, favorites, selectedIds, onToggle }: {
  data: AQIData[];
  favorites: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [pickerExpanded, setPickerExpanded] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastState>({});
  const selected = selectedIds.map(id => data.find(item => item.id === id)).filter(Boolean) as AQIData[];

  useEffect(() => {
    selected.forEach(item => {
      if (forecasts[item.id]) return;
      setForecasts(current => ({ ...current, [item.id]: { loading: true, points: [] } }));
      axios.get('/api/aqi/detail', { params: { city: item.city } })
        .then(response => setForecasts(current => ({ ...current, [item.id]: { loading: false, points: response.data.forecast || [] } })))
        .catch(() => setForecasts(current => ({ ...current, [item.id]: { loading: false, points: [], error: true } })));
    });
  }, [selectedIds.join('|')]);

  const choices = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...data]
      .sort((a, b) => {
        const favoriteDifference = Number(favorites.includes(b.id)) - Number(favorites.includes(a.id));
        if (favoriteDifference) return favoriteDifference;
        if (!search) {
          const aRank = SUGGESTED_CITIES.indexOf(a.city);
          const bRank = SUGGESTED_CITIES.indexOf(b.city);
          if (aRank !== -1 || bRank !== -1) return (aRank === -1 ? 999 : aRank) - (bRank === -1 ? 999 : bRank);
        }
        return a.city.localeCompare(b.city);
      })
      .filter(item => !selectedIds.includes(item.id))
      .filter(item => !search || `${item.city} ${item.country}`.toLowerCase().includes(search))
      .slice(0, search ? 10 : 8);
  }, [data, favorites, query, selectedIds]);

  const analyzed = selected.map(item => ({ item, forecast: forecasts[item.id], stats: metrics(forecasts[item.id]?.points || []) }));
  const ready = analyzed.filter(entry => entry.stats);
  const winner = ready.length >= 2 ? [...ready].sort((a, b) => ((a.stats!.average * .65) + (a.item.value * .35)) - ((b.stats!.average * .65) + (b.item.value * .35)))[0] : null;
  const cleanestPm25 = selected.length >= 2 ? [...selected].sort((a, b) => a.pm25 - b.pm25)[0] : null;
  const currentSpread = selected.length >= 2 ? Math.round(Math.max(...selected.map(item => item.value)) - Math.min(...selected.map(item => item.value))) : 0;

  return <section className="panel compare-panel">
    <div className="panel-title"><div><span className="eyebrow">Decision comparison</span><h2>Current air and the next 24 hours</h2></div><span>{selected.length}/3 selected</span></div>

    <div className="compare-selector">
      <div className="selected-cities" aria-label="Selected cities">{[0, 1, 2].map(index => { const item = selected[index]; return item ? <div className="selected-city" key={item.id}><span><Check size={14}/><span><b>{item.city}</b><small>{item.country}</small></span></span><button onClick={() => { onToggle(item.id); setPickerExpanded(true); }} aria-label={`Remove ${item.city}`}><X size={15}/></button></div> : <div className="selected-city empty" key={index}><span>{index + 1}</span><span>Choose a city</span></div>; })}</div>
      {selected.length < 2 || pickerExpanded ? <>
        <label className="compare-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by city or country…" aria-label="Search cities to compare"/>{query && <button onClick={() => setQuery('')} aria-label="Clear city search"><X size={15}/></button>}</label>
        <div className="choice-heading"><span>{query ? `Results for “${query}”` : favorites.length ? 'Favorites and suggested cities' : 'Suggested cities'}</span><small>{selectedIds.length >= 3 ? 'Remove one city to choose another' : 'Tap a city to add it'}</small></div>
        <div className="city-choices">{choices.length ? choices.map(item => { const category = getAqiCategory(item.value); return <button key={item.id} onClick={() => { onToggle(item.id); setQuery(''); if (selectedIds.length >= 1) setPickerExpanded(false); }} disabled={selectedIds.length >= 3}><span><MapPin size={14}/><span><b>{item.city}</b><small>{item.country}</small></span></span><strong style={{ color: category.color }}>{Math.round(item.value)} <small>AQI</small></strong><span className="add-city">+</span></button>; }) : <p>No matching city found. Try a different spelling.</p>}</div>
      </> : <button className="change-cities" onClick={() => setPickerExpanded(true)}><Search size={15}/> Add or change a city</button>}
    </div>

    {selected.length >= 2 && <div className="comparison-verdict">
      <div className="verdict-icon"><Award size={22}/></div>
      <div><span className="eyebrow">Best overall outlook</span>{winner ? <><h3>{winner.item.city} is the better choice</h3><p>It combines the lowest current-and-forecast exposure of your selected cities: {Math.round(winner.item.value)} now and a {winner.stats!.average} AQI 24-hour average. The cleanest modeled window is around {winner.stats!.lowest.label}.</p></> : <><h3>Calculating the 24-hour outlook…</h3><p>Current readings are ready. Forecast comparison will appear as each city finishes loading.</p></>}</div>
      <dl><div><dt>Current AQI spread</dt><dd>{currentSpread}</dd></div><div><dt>Lowest PM2.5 now</dt><dd>{cleanestPm25?.city}</dd></div></dl>
    </div>}

    {selected.length ? <div className="comparison-grid detailed">{analyzed.map(({ item, forecast, stats }) => { const category = getAqiCategory(item.value); return <article key={item.id} style={{ '--aqi-color': category.color } as React.CSSProperties}>
      <button onClick={() => { onToggle(item.id); setPickerExpanded(true); }} aria-label={`Remove ${item.city}`}><X size={15}/></button>
      <div className="compare-card-heading"><MapPin size={17}/><div><h3>{item.city}</h3><p>{item.country}</p></div></div>
      <div className="compare-current"><div><span>Current US AQI</span><strong>{Math.round(item.value)}</strong></div><Badge value={item.value}/></div>
      <div className="compare-pm"><Wind size={14}/><span>PM2.5 now</span><b>{item.pm25.toFixed(1)} µg/m³</b></div>
      {forecast?.loading ? <div className="compare-loading"><Loader2 className="spin" size={18}/> Loading 24-hour outlook…</div> : stats ? <>
        <div className="mini-chart"><ResponsiveContainer width="100%" height={86}><AreaChart data={forecast.points}><defs><linearGradient id={`mini-${item.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={category.color} stopOpacity={.35}/><stop offset="100%" stopColor={category.color} stopOpacity={0}/></linearGradient></defs><YAxis hide domain={['dataMin - 10', 'dataMax + 10']}/><Area dataKey="aqi" type="monotone" stroke={category.color} fill={`url(#mini-${item.id})`} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        <div className="forecast-metrics"><div><Activity size={14}/><span>24h average<b>{stats.average} AQI</b></span></div><div><TrendingUp size={14}/><span>Expected peak<b>{stats.peak.aqi} at {stats.peak.label}</b></span></div><div><Clock3 size={14}/><span>Cleanest hour<b>{stats.lowest.aqi} at {stats.lowest.label}</b></span></div><div>{stats.change > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}<span>24h direction<b>{stats.change === 0 ? 'Stable' : `${Math.abs(stats.change)} points ${stats.change > 0 ? 'worse' : 'better'}`}</b></span></div></div>
      </> : <div className="compare-loading"><span>24-hour outlook unavailable.</span></div>}
      <p className="compare-advice">{category.advisory}</p>
    </article>; })}</div> : <div className="empty-state compact"><Sparkles size={30}/><h3>Build a useful comparison</h3><p>Choose at least two cities to get a recommendation, 24-hour averages, expected peaks, and the cleanest time window.</p></div>}
  </section>;
}
