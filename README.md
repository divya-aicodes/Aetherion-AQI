# Aetherion AQI

Aetherion is a focused air-quality dashboard for understanding current PM2.5 and US AQI across a curated network of Indian and global cities.

## What it does

- Shows current modeled US AQI and PM2.5 with observation time and source
- Explains health guidance using the standard US AQI categories
- Provides a searchable, responsive city map
- Displays a modeled 24-hour outlook for the selected city
- Lets users save favorites locally and compare up to three cities
- Offers an optional authenticated AI assistant grounded in the selected reading
- Clearly labels data limitations instead of presenting modeled values as regulatory measurements

## Data and limitations

Current conditions and hourly outlooks come from the Open-Meteo Air Quality API. Values represent atmospheric model output at fixed city-center coordinates. They are **not** measurements from a regulatory station, medical advice, or a replacement for local government alerts.

The Express server caches the city feed for five minutes, does not fabricate failed readings, and exposes the provider and observation timestamp with every result.

## Local setup

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add `GEMINI_API_KEY` if you want to use the assistant.
4. Enable Google sign-in in Firebase and add `localhost` to **Authentication → Settings → Authorized domains**.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

The public AQI dashboard does not require sign-in. Authentication protects the AI endpoint.

## Quality checks

`npm run check` runs TypeScript validation, unit tests, and a production build.

## Production notes

Run `npm run build`, set `NODE_ENV=production`, and start with `npm start`. Store secrets in the deployment platform—not in Git. A public deployment should also add HTTPS, observability, an infrastructure-level rate limiter, and an official local monitoring feed if regulatory accuracy is required.
