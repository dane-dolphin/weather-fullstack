import { z } from 'zod';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const HourlyForecastEntrySchema = z.object({
  time: z.string(),
  temp: z.number(),
  weatherCode: z.number().int().nonnegative(),
  isDay: z.boolean(),
  precipProbability: z.number().min(0).max(100),
});

export type HourlyForecastEntry = z.infer<typeof HourlyForecastEntrySchema>;

export const WeatherSnapshotSchema = z.object({
  high: z.number(),
  low: z.number(),
  currentTemp: z.number(),
  apparentTemp: z.number(),
  precipitation: z.number().nonnegative(),
  windSpeed: z.number().nonnegative(),
  windDirection: z.number().min(0).max(360),
  humidity: z.number().min(0).max(100),
  pressure: z.number().optional(),
  weatherCode: z.number().int().nonnegative().optional(),
  isDay: z.boolean().optional(),
  sunrise: z.string().optional(),
  sunset: z.string().optional(),
  dailyWeatherCode: z.number().int().nonnegative().optional(),
  forecast: z.array(HourlyForecastEntrySchema).optional(),
  source: z.enum(['open-meteo', 'google']),
  fetchedAt: z.iso.datetime(),
});

export type WeatherSnapshot = z.infer<typeof WeatherSnapshotSchema>;

export const AlertSchema = z.object({
  alert_id: z.string(),
  state: z.string().length(2),
  event: z.string(),
  severity: z.enum(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']),
  headline: z.string().nullable(),
  description: z.string().nullable(),
  affected_zones: z.array(z.string()),
  is_state_wide: z.boolean(),
  effective: z.iso.datetime(),
  expires: z.iso.datetime(),
  source: z.literal('nws'),
});

export type Alert = z.infer<typeof AlertSchema>;

export const EarthquakeSchema = z.object({
  quake_id: z.string(),
  magnitude: z.number(),
  place: z.string(),
  time: z.number(),
  lat: z.number(),
  lon: z.number(),
});

export type Earthquake = z.infer<typeof EarthquakeSchema>;

export const GeocodeEntrySchema = z.object({
  lat_2dp: z.number(),
  lon_2dp: z.number(),
  state: z.string().length(2),
  county_zone: z.string(),
  forecast_zone: z.string(),
  fire_weather_zone: z.string(),
  cwa: z.string(),
  grid_id: z.string(),
  grid_x: z.number().int(),
  grid_y: z.number().int(),
  radar_station: z.string().optional(),
  time_zone: z.string(),
  resolved_at: z.number(),
  city: z.string().nullable().optional(),
});

export type GeocodeEntry = z.infer<typeof GeocodeEntrySchema>;

export const WeatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export interface ResolvedEvent extends APIGatewayProxyEvent {
  resolved: { lat: number; lon: number; geo: GeocodeEntry };
}

export interface GeocodeRepo {
  get(lat_2dp: number, lon_2dp: number): Promise<GeocodeEntry | null>;
  put(entry: GeocodeEntry): Promise<GeocodeEntry>;
  updateCity(lat_2dp: number, lon_2dp: number, city: string): Promise<void>;
  listAllCellKeys(): Promise<Array<{ lat_2dp: number; lon_2dp: number }>>;
}
