/**
 * WMO Weather Interpretation Codes.
 * @see https://open-meteo.com/en/docs#weathervariables
 */
export type WeatherCode =
  | 0   // Clear sky
  | 1   // Mainly clear
  | 2   // Partly cloudy
  | 3   // Overcast
  | 45  // Fog
  | 48  // Fog, depositing rime
  | 51  // Drizzle: light
  | 53  // Drizzle: moderate
  | 55  // Drizzle: dense
  | 61  // Rain: slight
  | 63  // Rain: moderate
  | 65  // Rain: heavy
  | 71  // Snow: slight
  | 73  // Snow: moderate
  | 75  // Snow: heavy
  | 77  // Snow grains
  | 80  // Rain showers: slight
  | 81  // Rain showers: moderate
  | 82  // Rain showers: violent
  | 85  // Snow showers: slight
  | 86  // Snow showers: heavy
  | 95  // Thunderstorm
  | 96  // Thunderstorm with hail
  | 99; // Thunderstorm with heavy hail

export type Location = {
  city?: string | null;
  state: string;
  county_zone: string;
  forecast_zone: string;
  time_zone: string;
};

export type HourlyEntry = {
  time: string;
  temp: number;
  weatherCode?: WeatherCode;
  isDay?: boolean;
  precipProbability: number;
};

export type Weather = {
  currentTemp: number;
  apparentTemp: number;
  high: number;
  low: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  pressure?: number;
  weatherCode?: WeatherCode;
  isDay?: boolean;
  sunrise?: string;
  sunset?: string;
  dailyWeatherCode?: WeatherCode;
  forecast?: HourlyEntry[];
  source: 'open-meteo' | 'google';
  fetchedAt: string;
  fetched_at: number;
  is_stale: boolean;
};

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';

export type NwsAlert = {
  alert_id: string;
  state: string;
  event: string;
  severity: AlertSeverity;
  headline: string | null;
  description: string | null;
  affected_zones: string[];
  is_state_wide: boolean;
  effective: string;
  expires: string;
  source: string;
};

export type Earthquake = {
  quake_id: string;
  magnitude: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
};

export type ApiSuccess = {
  lat: number;
  lon: number;
  as_of: string;
  location: Location;
  weather: Weather | null;
  alerts: NwsAlert[];
  earthquakes: Earthquake[];
};

export type ApiError = {
  error: string;
};
