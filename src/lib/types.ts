export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface AQIData {
  id: string;
  location: string;
  city: string;
  country: string;
  parameter: 'pm25';
  value: number;
  lastUpdated: string;
  unit: 'µg/m³';
  pm25: number;
  isEstimated: boolean;
  source: string;
  coordinates: Coordinates;
}

export interface AqiForecastPoint {
  time: string;
  label: string;
  aqi: number;
  pm25: number;
}

export interface AqiCategory {
  label: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  color: string;
  advisory: string;
}

export interface AqiLiveMeta {
  count: number;
  monitoredLocations: number;
  timestamp: string;
  dataTimestamp: string | null;
  cacheTtlSeconds: number;
  source: string;
  syntheticData: false;
  stale: boolean;
  staleAgeMinutes: number;
  warning?: string;
  unavailableBatches?: number;
}

export interface AqiLiveResponse {
  results: AQIData[];
  meta: AqiLiveMeta;
}

export interface AqiDetailMeta {
  source: string;
  modeled: true;
  stale: boolean;
  staleAgeMinutes: number;
  warning?: string;
}

export interface AqiDetailResponse {
  city: string;
  country: string;
  forecast: AqiForecastPoint[];
  meta: AqiDetailMeta;
}

export interface AssistantContext {
  city: string;
  country: string;
  aqi: number;
  pm25?: number;
  observedAt: string;
  source: string;
}
