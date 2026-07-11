# Aetherion AQI

Aetherion is an environmental intelligence dashboard for exploring current PM2.5 and US AQI readings across a curated global city network. It combines an interactive map, descriptive statistics, clearly labeled scenario exploration, saved preferences, and authenticated AI-assisted policy analysis.

## Data integrity

- Current readings come from the Open-Meteo Air Quality API.
- The server caches readings for 5 minutes and never fabricates missing stations.
- Records include provider, observation time, PM2.5 concentration, units, and coordinates.
- US AQI fallback conversion uses EPA PM2.5 breakpoints in `src/lib/aqi.ts`.
- Policy controls are illustrative scenarios—not forecasts or medical advice.

## Architecture

- React 19, TypeScript, Vite and Tailwind CSS frontend
- Express API and production static server
- Open-Meteo server-side aggregation
- Firebase Authentication and per-user Firestore preferences
- Gemini requests proxied through authenticated, rate-limited server endpoints
- Vitest unit tests for AQI conversion and statistics

## Local setup

1. Install Node.js 20 or later and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `GEMINI_API_KEY` and `FIREBASE_API_KEY`.
4. Enable Google sign-in in Firebase, add `localhost` under **Authentication → Settings → Authorized domains**, and deploy `firestore.rules`.
5. Run `npm run dev`, then open `http://localhost:3000`.

## Quality checks

Run `npm run check` to execute TypeScript checking, unit tests, and a production build. `GET /api/health` reports API/cache health.

## Production

Run `npm run build`, set `NODE_ENV=production`, and start with `npm start`. Keep secrets in the deployment platform's secret manager. Add infrastructure-level HTTPS, structured logs, and distributed rate limiting when deploying multiple instances.

## Limitations

Readings are provider model data at fixed coordinates, not regulatory-station measurements. Scenario coefficients are exploratory assumptions and must be calibrated against local inventories and peer-reviewed models before policy use.
