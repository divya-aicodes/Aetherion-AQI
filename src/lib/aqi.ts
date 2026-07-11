export type AqiCategory = {
  label: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  color: string;
  advisory: string;
};

// US EPA AQI breakpoints for 24-hour PM2.5 concentrations (µg/m³).
const PM25_BREAKPOINTS = [
  [0, 9, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
] as const;

export function pm25ToUsAqi(concentration: number): number {
  if (!Number.isFinite(concentration) || concentration < 0) return 0;
  const value = Math.floor(concentration * 10) / 10;
  const breakpoint = PM25_BREAKPOINTS.find(([low, high]) => value >= low && value <= high);
  if (!breakpoint) return value > 325.4 ? 500 : 0;
  const [cLow, cHigh, iLow, iHigh] = breakpoint;
  return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (value - cLow) + iLow);
}

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return { label: 'Good', color: '#10b981', advisory: 'Air quality is satisfactory.' };
  if (aqi <= 100) return { label: 'Moderate', color: '#fbbf24', advisory: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#f97316', advisory: 'Sensitive groups should reduce prolonged or heavy outdoor exertion.' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#ef4444', advisory: 'Everyone should reduce prolonged or heavy outdoor exertion.' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#a855f7', advisory: 'Avoid prolonged or heavy outdoor exertion.' };
  return { label: 'Hazardous', color: '#7f1d1d', advisory: 'Remain indoors and keep activity levels low.' };
}
