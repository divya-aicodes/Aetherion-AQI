export interface AQIData {
  id: string;
  location: string;
  city: string;
  country: string;
  parameter?: string;
  value: number;
  lastUpdated: string;
  unit?: string;
  pm25?: number;
  isEstimated?: boolean;
  source: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  riskLevel?: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
}

export interface SimulationResult {
  oldAqi: number;
  newAqi: number;
  change: number;
  percentImprovement: number;
  breakdown: {
    intervention: number;
    strategies: number;
  };
  recommendations: string[];
}
