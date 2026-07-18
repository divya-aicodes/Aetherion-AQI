import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AnimatePresence } from 'motion/react';
import {
  Activity, AlertTriangle, Bot, Check, Clock3, CloudSun, HeartPulse, Info,
  LayoutDashboard, Loader2, LogIn, LogOut, Map, RefreshCw, Search, ShieldCheck,
  Star, TrendingDown, TrendingUp, Wind,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CityCompare from './components/CityCompare';
import BlurText from './components/reactbits/BlurText';
import BorderGlow from './components/reactbits/BorderGlow';
import GooeyNav from './components/reactbits/GooeyNav';
import ShinyText from './components/reactbits/ShinyText';
import IntroPage from './IntroPage';
import { auth, loginWithGoogle, logout } from './firebase';
import { getAqiCategory } from './lib/aqi';
import type { AQIData, AqiForecastPoint } from './types';

const AetherionMap = lazy(() => import('./components/AetherionMap'));
const Chatbot = lazy(() => import('./components/Chatbot'));
type Tab = 'overview' | 'map' | 'compare' | 'assistant';
type CityFilter = 'all' | 'favorites' | 'unhealthy';

const tabs: Array<{ id: Tab; label: string; icon: typeof Wind }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'compare', label: 'Compare', icon: CloudSun },
  { id: 'assistant', label: 'AQI Assistant', icon: Bot },
];

const pageDescriptions: Record<Tab, string> = {
  overview: 'Understand current conditions and the next 24 hours.',
  map: 'Find a city and see how conditions differ by location.',
  compare: 'Compare current exposure, forecasts, and the cleanest time window.',
  assistant: 'Ask plain-language questions using the selected city as context.',
};

function formatObservation(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function minutesSince(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.round((Date.now() - time) / 60000));
}

function freshness(value?: string | null) {
  const minutes = minutesSince(value);
  if (minutes === null) return 'Time unavailable';
  if (minutes < 2) return 'Updated just now';
  return `Updated ${minutes} min ago`;
}

function forecastMetrics(points: AqiForecastPoint[]) {
  if (!points.length) return null;
  const average = Math.round(points.reduce((sum, point) => sum + point.aqi, 0) / points.length);
  const peak = points.reduce((best, point) => point.aqi > best.aqi ? point : best);
  const lowest = points.reduce((best, point) => point.aqi < best.aqi ? point : best);
  const change = Math.round(points[points.length - 1].aqi - points[0].aqi);
  return { average, peak, lowest, change };
}

function AqiBadge({ value }: { value: number }) {
  const category = getAqiCategory(value);
  return <span className="aqi-badge" style={{ color: category.color, borderColor: `${category.color}55`, background: `${category.color}12` }}>{category.label}</span>;
}

function DataNotice() {
  return <div className="data-notice"><Info size={17}/><p><strong>Know what you are seeing.</strong> Open-Meteo modeled values at city-center coordinates—not regulatory monitor readings. Use local authority alerts for official decisions.</p></div>;
}

export default function App() {
  const [data, setData] = useState<AQIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ monitoredLocations?: number }>({});
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('aetherion:favorites') || '[]'));
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [forecast, setForecast] = useState<AqiForecastPoint[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('aetherion:intro-seen') !== 'yes');
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchData = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const response = await axios.get('/api/aqi/live', { headers: { 'Cache-Control': 'no-cache' } });
      const readings: AQIData[] = response.data.results || [];
      setData(readings);
      setMeta(response.data.meta || {});
      setLastSync(response.data.meta?.timestamp || new Date().toISOString());
      setSelectedId(current => current && readings.some(item => item.id === current) ? current : readings[0]?.id || null);
    } catch {
      setError('Current air-quality data could not be refreshed. Your last successful results remain visible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = window.setInterval(() => fetchData(false), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { localStorage.setItem('aetherion:favorites', JSON.stringify(favorites)); }, [favorites]);

  const selected = data.find(item => item.id === selectedId) || data[0];
  useEffect(() => {
    if (!selected?.city) return;
    setForecastLoading(true);
    axios.get('/api/aqi/detail', { params: { city: selected.city } })
      .then(response => setForecast(response.data.forecast || []))
      .catch(() => setForecast([]))
      .finally(() => setForecastLoading(false));
  }, [selected?.city]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return data
      .filter(item => !text || `${item.city} ${item.country}`.toLowerCase().includes(text))
      .filter(item => cityFilter === 'all' || cityFilter === 'favorites' && favorites.includes(item.id) || cityFilter === 'unhealthy' && item.value > 100)
      .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || b.value - a.value);
  }, [cityFilter, data, favorites, query]);

  const category = selected ? getAqiCategory(selected.value) : null;
  const outlook = forecastMetrics(forecast);
  const readingAge = minutesSince(selected?.lastUpdated);
  const toggleFavorite = (id: string) => setFavorites(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  const toggleCompare = (id: string) => setCompareIds(items => items.includes(id) ? items.filter(item => item !== id) : items.length < 3 ? [...items, id] : items);
  const chooseCity = (id: string) => { setSelectedId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const closeIntro = () => { sessionStorage.setItem('aetherion:intro-seen', 'yes'); setShowIntro(false); };
  const signIn = async () => {
    setAuthBusy(true); setAuthError(null);
    try { await loginWithGoogle(); closeIntro(); }
    catch (cause: any) {
      if (cause?.code !== 'auth/popup-closed-by-user') setAuthError(cause?.code === 'auth/unauthorized-domain' ? `Add ${window.location.hostname} to Firebase Authorized domains.` : 'Google sign-in did not complete. Please try again.');
    } finally { setAuthBusy(false); }
  };
  const disconnect = async () => { await logout(); setShowDisconnect(false); setActiveTab('overview'); setShowIntro(true); sessionStorage.removeItem('aetherion:intro-seen'); };

  return <div className="app-shell">
    <AnimatePresence>{showIntro && <IntroPage onClose={closeIntro} user={user} isAuthenticating={authBusy} handleLogin={signIn} loginError={authError} readings={data}/>}</AnimatePresence>
    <header className="topbar">
      <button className="brand" onClick={() => { setActiveTab('overview'); setShowIntro(true); }} aria-label="Open Aetherion introduction"><span className="brand-mark"><Wind size={21}/></span><span><strong>AETHERION</strong><small>Air quality, clearly explained</small></span></button>
      <GooeyNav items={tabs.map(tab => ({ label: tab.label, icon: <tab.icon size={15}/> }))} activeIndex={tabs.findIndex(tab => tab.id === activeTab)} onSelect={index => setActiveTab(tabs[index].id)}/>
      <div className="account">{user ? <><img src={user.photoURL || ''} alt=""/><span>{user.displayName?.split(' ')[0]}</span><button className="icon-button" onClick={() => setShowDisconnect(true)} aria-label="Sign out"><LogOut size={17}/></button></> : <button className="text-button" onClick={signIn}><LogIn size={16}/> Sign in</button>}</div>
    </header>

    <main className="main-content">
      <div className="page-heading"><div><span className="eyebrow"><span className={error ? 'status-dot error' : 'status-dot'}/><ShinyText text={error ? 'Data connection interrupted' : 'Live city overview'} color={error ? '#d8757d' : '#6f829a'} shineColor={error ? '#ffd2d5' : '#dbeafe'}/></span><BlurText key={activeTab} as="h1" text={activeTab === 'overview' ? 'Air quality at a glance' : tabs.find(tab => tab.id === activeTab)?.label || ''} delay={45}/><p>{pageDescriptions[activeTab]} · {data.length} locations · Open-Meteo</p></div><button className="refresh-button" onClick={() => fetchData(false)} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh data'}</button></div>
      {error && <div className="error-banner"><AlertTriangle size={17}/>{error}</div>}

      {loading ? <div className="loading-state"><Loader2 className="spin"/>Loading current air quality…</div> : <>
        {activeTab === 'overview' && selected && category && <div className="stack">
          <DataNotice/>
          {readingAge !== null && readingAge > 90 && <div className="stale-banner"><Clock3 size={16}/><span>This modeled observation is {readingAge} minutes old. Check the timestamp before making time-sensitive decisions.</span></div>}
          <section className="hero-grid">
            <BorderGlow className="current-glow" edgeSensitivity={24} glowColor="215 90 70" animated colors={[category.color, '#3b82f6', '#34d399']}><article className="current-card" style={{ '--aqi-color': category.color } as React.CSSProperties}>
              <div className="city-picker"><Search size={16}/><select value={selected.id} onChange={event => setSelectedId(event.target.value)} aria-label="Choose a city">{data.map(item => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}</select><button onClick={() => toggleFavorite(selected.id)} aria-label={favorites.includes(selected.id) ? 'Remove favorite' : 'Add favorite'}><Star size={18} fill={favorites.includes(selected.id) ? 'currentColor' : 'none'}/></button></div>
              <div className="current-value"><div><span>Current US AQI</span><strong>{Math.round(selected.value)}</strong></div><AqiBadge value={selected.value}/></div>
              <p className="advisory"><HeartPulse size={18}/>{category.advisory}</p>
              <div className="reading-meta"><span><Wind size={14}/>PM2.5 <b>{selected.pm25.toFixed(1)} µg/m³</b></span><span><Clock3 size={14}/>{freshness(selected.lastUpdated)}</span></div>
            </article></BorderGlow>
            <article className="panel forecast-panel">
              <div className="panel-title"><div><span className="eyebrow">Modeled outlook</span><h2>What to expect in the next 24 hours</h2></div><span>{selected.city}</span></div>
              {forecastLoading ? <div className="chart-loading"><Loader2 className="spin"/></div> : forecast.length ? <><ResponsiveContainer width="100%" height={205}><AreaChart data={forecast}><defs><linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={category.color} stopOpacity={.35}/><stop offset="100%" stopColor={category.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0d" vertical={false}/><XAxis dataKey="label" tick={{ fill: '#7f8794', fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 'auto']} tick={{ fill: '#7f8794', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: '#10141b', border: '1px solid #2a303a', borderRadius: 10 }} formatter={value => [`${value} AQI`, 'US AQI']}/><Area type="monotone" dataKey="aqi" stroke={category.color} fill="url(#aqiFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer>{outlook && <div className="outlook-summary"><div><Activity size={15}/><span>24h average<b>{outlook.average} AQI</b></span></div><div><TrendingUp size={15}/><span>Expected peak<b>{outlook.peak.aqi} at {outlook.peak.label}</b></span></div><div><Clock3 size={15}/><span>Cleanest hour<b>{outlook.lowest.aqi} at {outlook.lowest.label}</b></span></div><div>{outlook.change > 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}<span>Direction<b>{outlook.change === 0 ? 'Stable' : `${Math.abs(outlook.change)} points ${outlook.change > 0 ? 'worse' : 'better'}`}</b></span></div></div>}</> : <div className="chart-loading">The 24-hour outlook is temporarily unavailable.</div>}
            </article>
          </section>
          <section className="panel city-browser">
            <div className="panel-title"><div><span className="eyebrow">City explorer</span><h2>Find the place you care about</h2></div><label className="search-box"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search city or country"/></label></div>
            <div className="city-tools"><div>{(['all', 'favorites', 'unhealthy'] as CityFilter[]).map(filter => <button key={filter} className={cityFilter === filter ? 'active' : ''} onClick={() => setCityFilter(filter)}>{filter === 'all' ? 'All cities' : filter === 'favorites' ? `Favorites (${favorites.length})` : 'AQI above 100'}</button>)}</div><span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span></div>
            {filtered.length ? <div className="city-table" role="table"><div className="table-head" role="row"><span>Location</span><span>US AQI</span><span>PM2.5</span><span>Status</span><span aria-label="Actions"/></div>{filtered.slice(0, 30).map(item => { const itemCategory = getAqiCategory(item.value); return <div className="table-row" role="row" key={item.id} onClick={() => chooseCity(item.id)}><span><b>{item.city}</b><small>{item.country}</small></span><span className="aqi-number" style={{ color: itemCategory.color }}>{Math.round(item.value)}</span><span>{item.pm25.toFixed(1)} <small>µg/m³</small></span><AqiBadge value={item.value}/><span className="row-actions"><button onClick={event => { event.stopPropagation(); toggleFavorite(item.id); }} aria-label={`${favorites.includes(item.id) ? 'Remove' : 'Add'} ${item.city} favorite`}><Star size={16} fill={favorites.includes(item.id) ? 'currentColor' : 'none'}/></button><button onClick={event => { event.stopPropagation(); toggleCompare(item.id); }} aria-label={`${compareIds.includes(item.id) ? 'Remove' : 'Add'} ${item.city} comparison`}>{compareIds.includes(item.id) ? <Check size={16}/> : <span>+</span>}</button></span></div>; })}</div> : <div className="empty-state compact"><Search size={28}/><h3>No cities match</h3><p>Try another search or change the filter.</p></div>}
          </section>
        </div>}

        {activeTab === 'map' && <div className="map-page"><DataNotice/><Suspense fallback={<div className="loading-state"><Loader2 className="spin"/>Loading map…</div>}><AetherionMap data={data} focusedCityId={selectedId} setFocusedCityId={setSelectedId} comparedIds={compareIds} onToggleCompare={toggleCompare} onViewOutlook={id => { setSelectedId(id); setActiveTab('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/></Suspense></div>}
        {activeTab === 'compare' && <div className="stack"><DataNotice/><CityCompare data={data} favorites={favorites} selectedIds={compareIds} onToggle={toggleCompare}/></div>}
        {activeTab === 'assistant' && <div className="assistant-page"><DataNotice/><div className="assistant-intro"><ShieldCheck size={22}/><div><h2>Ask about {selected?.city || 'air quality'}</h2><p>The assistant receives the selected reading and timestamp. It explains—not diagnoses—and does not replace official alerts.</p></div></div><Suspense fallback={<div className="loading-state"><Loader2 className="spin"/>Loading assistant…</div>}><Chatbot onSignIn={signIn} context={selected ? { city: selected.city, country: selected.country, aqi: selected.value, pm25: selected.pm25, observedAt: selected.lastUpdated, source: selected.source } : undefined}/></Suspense></div>}
      </>}
    </main>

    <footer><span>Aetherion AQI</span><span>Observation: {formatObservation(selected?.lastUpdated)} · API sync: {formatObservation(lastSync)} · {meta.monitoredLocations || data.length} locations</span></footer>
    {showDisconnect && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="disconnect-title"><div className="modal-icon"><LogOut size={22}/></div><h2 id="disconnect-title">Sign out of Aetherion?</h2><p>You will return to the welcome screen. Favorites saved on this device will remain.</p><div><button className="secondary-button" onClick={() => setShowDisconnect(false)}>Cancel</button><button className="danger-button" onClick={disconnect}>Sign out</button></div></div></div>}
  </div>;
}
