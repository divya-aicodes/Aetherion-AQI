import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { pm25ToUsAqi } from './src/lib/aqi.js';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

// Match Vite's local-development convention while keeping deployment
// environments free to provide real process-level secrets.
dotenv.config({ path: '.env.local', override: false });
dotenv.config({ override: false });

const PORT = Number(process.env.PORT) || 3000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CITIES: Record<string, { coordinates: [number, number]; country: string }> = {
  Chennai: { coordinates: [13.0827, 80.2707], country: 'India' },
  Bengaluru: { coordinates: [12.9716, 77.5946], country: 'India' },
  Hyderabad: { coordinates: [17.385, 78.4867], country: 'India' },
  Kochi: { coordinates: [9.9312, 76.2673], country: 'India' },
  Mumbai: { coordinates: [19.076, 72.8777], country: 'India' },
  'New Delhi': { coordinates: [28.6139, 77.209], country: 'India' },
  Kolkata: { coordinates: [22.5726, 88.3639], country: 'India' },
  Pune: { coordinates: [18.5204, 73.8567], country: 'India' },
  Ahmedabad: { coordinates: [23.0225, 72.5714], country: 'India' },
  Jaipur: { coordinates: [26.9124, 75.7873], country: 'India' },
  Lucknow: { coordinates: [26.8467, 80.9462], country: 'India' },
  Kanpur: { coordinates: [26.4499, 80.3319], country: 'India' },
  Varanasi: { coordinates: [25.3176, 82.9739], country: 'India' },
  Agra: { coordinates: [27.1767, 78.0081], country: 'India' },
  Noida: { coordinates: [28.5355, 77.391], country: 'India' },
  Gurugram: { coordinates: [28.4595, 77.0266], country: 'India' },
  Chandigarh: { coordinates: [30.7333, 76.7794], country: 'India' },
  Amritsar: { coordinates: [31.634, 74.8723], country: 'India' },
  Ludhiana: { coordinates: [30.901, 75.8573], country: 'India' },
  Dehradun: { coordinates: [30.3165, 78.0322], country: 'India' },
  Srinagar: { coordinates: [34.0837, 74.7973], country: 'India' },
  Shimla: { coordinates: [31.1048, 77.1734], country: 'India' },
  Jodhpur: { coordinates: [26.2389, 73.0243], country: 'India' },
  Udaipur: { coordinates: [24.5854, 73.7125], country: 'India' },
  Surat: { coordinates: [21.1702, 72.8311], country: 'India' },
  Vadodara: { coordinates: [22.3072, 73.1812], country: 'India' },
  Rajkot: { coordinates: [22.3039, 70.8022], country: 'India' },
  Nashik: { coordinates: [19.9975, 73.7898], country: 'India' },
  Nagpur: { coordinates: [21.1458, 79.0882], country: 'India' },
  Indore: { coordinates: [22.7196, 75.8577], country: 'India' },
  Bhopal: { coordinates: [23.2599, 77.4126], country: 'India' },
  Patna: { coordinates: [25.5941, 85.1376], country: 'India' },
  Ranchi: { coordinates: [23.3441, 85.3096], country: 'India' },
  Raipur: { coordinates: [21.2514, 81.6296], country: 'India' },
  Bhubaneswar: { coordinates: [20.2961, 85.8245], country: 'India' },
  Guwahati: { coordinates: [26.1445, 91.7362], country: 'India' },
  Shillong: { coordinates: [25.5788, 91.8933], country: 'India' },
  Visakhapatnam: { coordinates: [17.6868, 83.2185], country: 'India' },
  Vijayawada: { coordinates: [16.5062, 80.648], country: 'India' },
  Tirupati: { coordinates: [13.6288, 79.4192], country: 'India' },
  Coimbatore: { coordinates: [11.0168, 76.9558], country: 'India' },
  Madurai: { coordinates: [9.9252, 78.1198], country: 'India' },
  Tiruchirappalli: { coordinates: [10.7905, 78.7047], country: 'India' },
  Salem: { coordinates: [11.6643, 78.146], country: 'India' },
  Mysuru: { coordinates: [12.2958, 76.6394], country: 'India' },
  Mangaluru: { coordinates: [12.9141, 74.856], country: 'India' },
  Kozhikode: { coordinates: [11.2588, 75.7804], country: 'India' },
  Thiruvananthapuram: { coordinates: [8.5241, 76.9366], country: 'India' },
  London: { coordinates: [51.5074, -0.1278], country: 'United Kingdom' },
  Paris: { coordinates: [48.8566, 2.3522], country: 'France' },
  Berlin: { coordinates: [52.52, 13.405], country: 'Germany' },
  Tokyo: { coordinates: [35.6895, 139.6917], country: 'Japan' },
  Beijing: { coordinates: [39.9042, 116.4074], country: 'China' },
  Singapore: { coordinates: [1.3521, 103.8198], country: 'Singapore' },
  Sydney: { coordinates: [-33.8688, 151.2093], country: 'Australia' },
  Dubai: { coordinates: [25.2048, 55.2708], country: 'United Arab Emirates' },
  Cairo: { coordinates: [30.0444, 31.2357], country: 'Egypt' },
  Nairobi: { coordinates: [-1.2921, 36.8219], country: 'Kenya' },
  'New York': { coordinates: [40.7128, -74.006], country: 'United States' },
  'Los Angeles': { coordinates: [34.0522, -118.2437], country: 'United States' },
  Toronto: { coordinates: [43.6532, -79.3832], country: 'Canada' },
  'Mexico City': { coordinates: [19.4326, -99.1332], country: 'Mexico' },
  'São Paulo': { coordinates: [-23.5505, -46.6333], country: 'Brazil' },
};

type AqiReading = { id: string; location: string; city: string; country: string; value: number; pm25: number; parameter: 'pm25'; unit: 'µg/m³'; source: 'Open-Meteo'; lastUpdated: string; coordinates: { latitude: number; longitude: number }; isEstimated: true };
let cache: { timestamp: number; readings: AqiReading[] } | null = null;
const requestLog = new Map<string, number[]>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter(time => now - time < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  recent.push(now); requestLog.set(key, recent); next();
}

async function requireFirebaseUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  // Firebase web API keys identify a project; unlike Gemini keys, they are public
  // configuration. The environment override is useful when deploying another project.
  const apiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!token || !apiKey) return res.status(401).json({ error: 'Authentication required.' });
  try {
    await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, { idToken: token }, { timeout: 5000 });
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired session.' }); }
}

async function fetchReadings(): Promise<AqiReading[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) return cache.readings;
  const entries = Object.entries(CITIES);
  const readings: AqiReading[] = [];
  // Open-Meteo accepts comma-separated coordinates and returns one result per
  // location. Four multi-location calls are far more reliable than 63 requests.
  for (let index = 0; index < entries.length; index += 10) {
    const batch = entries.slice(index, index + 10);
    let data: unknown = null;
    for (let attempt = 0; attempt < 3 && !data; attempt += 1) {
      try {
        const response = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
        params: {
          latitude: batch.map(([, meta]) => meta.coordinates[0]).join(','),
          longitude: batch.map(([, meta]) => meta.coordinates[1]).join(','),
          current: 'pm2_5,us_aqi',
          timezone: 'UTC',
        },
          timeout: 30_000,
        });
        data = response.data;
      } catch (error) {
        if (attempt === 2) console.warn(`AQI batch ${Math.floor(index / 10) + 1} unavailable:`, error instanceof Error ? error.message : error);
        else await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
      }
    }
    if (data) {
      const responses = Array.isArray(data) ? data : [data];
      responses.forEach((response, responseIndex) => {
        const entry = batch[responseIndex];
        if (!entry) return;
        const [city, meta] = entry;
        const [latitude, longitude] = meta.coordinates;
        const pm25 = Number(response?.current?.pm2_5);
        if (!Number.isFinite(pm25) || pm25 < 0) return;
        const providerAqi = Number(response?.current?.us_aqi);
        readings.push({ id: `open-meteo-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, location: city, city, country: meta.country, value: Math.min(500, Number.isFinite(providerAqi) ? Math.round(providerAqi) : pm25ToUsAqi(pm25)), pm25: Math.round(pm25 * 10) / 10, parameter: 'pm25', unit: 'µg/m³', source: 'Open-Meteo', lastUpdated: response.current.time ? `${response.current.time}Z` : new Date().toISOString(), coordinates: { latitude, longitude }, isEstimated: true });
      });
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (readings.length) cache = { timestamp: Date.now(), readings };
  return readings;
}

function cleanText(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

async function startServer() {
  const app = express();
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', dataProvider: 'Open-Meteo', cacheAgeSeconds: cache ? Math.round((Date.now() - cache.timestamp) / 1000) : null }));
  app.get('/api/aqi/live', async (_req, res) => {
    try { const results = await fetchReadings(); res.set('Cache-Control', 'no-store, max-age=0').json({ results, meta: { count: results.length, monitoredLocations: Object.keys(CITIES).length, timestamp: new Date().toISOString(), cacheTtlSeconds: CACHE_TTL_MS / 1000, source: 'Open-Meteo', syntheticData: false } }); }
    catch { res.status(502).json({ error: 'Air-quality provider is temporarily unavailable.' }); }
  });
  app.get('/api/aqi/detail', async (req, res) => {
    const city = cleanText(req.query.city, 80);
    const entry = Object.entries(CITIES).find(([name]) => name.toLowerCase() === city.toLowerCase());
    if (!entry) return res.status(404).json({ error: 'City is not in the monitored location list.' });
    const [name, meta] = entry;
    try {
      const response = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
        params: { latitude: meta.coordinates[0], longitude: meta.coordinates[1], hourly: 'pm2_5,us_aqi', forecast_days: 2, timezone: 'auto' },
        timeout: 20_000,
      });
      const times: string[] = response.data?.hourly?.time || [];
      const aqiValues: Array<number | null> = response.data?.hourly?.us_aqi || [];
      const pm25Values: Array<number | null> = response.data?.hourly?.pm2_5 || [];
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const forecast = times.map((time, index) => ({ time, aqi: Number(aqiValues[index]), pm25: Number(pm25Values[index]) }))
        .filter(point => Number.isFinite(point.aqi) && Number.isFinite(point.pm25) && new Date(point.time).getTime() >= oneHourAgo)
        .slice(0, 24)
        .map(point => ({ ...point, aqi: Math.min(500, Math.round(point.aqi)), pm25: Math.round(point.pm25 * 10) / 10, label: new Date(point.time).toLocaleTimeString('en', { hour: 'numeric' }) }));
      return res.set('Cache-Control', 'public, max-age=900').json({ city: name, country: meta.country, forecast, meta: { source: 'Open-Meteo', modeled: true } });
    } catch {
      return res.status(502).json({ error: 'The hourly air-quality outlook is temporarily unavailable.' });
    }
  });

  app.use('/api/ai', rateLimit, requireFirebaseUser);
  app.post('/api/ai/chat', async (req, res) => {
    const message = cleanText(req.body?.message, 2000); if (!message) return res.status(400).json({ error: 'Message is required.' });
    if (!ai) return res.status(503).json({ error: 'AI service is not configured.' });
    const context = JSON.stringify(req.body?.context || {}).slice(0, 1200);
    const history = JSON.stringify(Array.isArray(req.body?.history) ? req.body.history.slice(-6) : []).slice(0, 3000);
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `You are Aetherion, a careful air-quality educator. Answer briefly in plain language. The supplied reading is modeled Open-Meteo data, not a regulatory sensor. Clearly distinguish evidence from inference, never invent a live reading, never diagnose illness, and recommend official local guidance for high-risk decisions. Current selected-city context: ${context}. Recent conversation: ${history}. User question: ${message}` }); res.json({ text: response.text || 'No response generated.' }); }
    catch { res.status(502).json({ error: 'AI provider is temporarily unavailable.' }); }
  });

  if (process.env.NODE_ENV !== 'production') { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  else { const dist = path.join(process.cwd(), 'dist'); app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); }
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('✓ Aetherion AQI server is ready');
    console.log(`✓ Open in your browser: http://localhost:${PORT}`);
    console.log('✓ Press Ctrl+C to stop the server');
    console.log('');
  });
}

startServer().catch(error => { console.error('Server failed to start:', error); process.exit(1); });
