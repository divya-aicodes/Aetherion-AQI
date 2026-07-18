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
  coordinates: { latitude: number; longitude: number };
}

export interface AqiForecastPoint {
  time: string;
  label: string;
  aqi: number;
  pm25: number;
}
