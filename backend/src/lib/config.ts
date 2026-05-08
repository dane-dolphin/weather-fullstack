import { z } from 'zod';

export const Env = z.object({
  WEATHER_PROVIDER: z.enum(['open-meteo', 'google']).default('open-meteo'),
  OPEN_METEO_BASE_URL: z.url().default('https://api.open-meteo.com/v1'),
  GOOGLE_WEATHER_API_KEY: z.string().optional(),
  GOOGLE_WEATHER_BASE_URL: z.url().default('https://weather.googleapis.com'),
  NWS_USER_AGENT: z.string().min(5),
  NOMINATIM_USER_AGENT: z.string().min(5),
  USGS_FEED_URL: z
    .url()
    .default(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson',
    ),
  GEOCODE_TABLE: z.string(),
  WEATHER_TABLE: z.string(),
  ALERTS_TABLE: z.string(),
  WEATHER_QUEUE_URL: z.url().optional(),
  CITY_LOOKUP_QUEUE_URL: z.url().optional(),
  AWS_REGION: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  WEATHER_FRESH_SECONDS: z.coerce.number().default(7200),
  WEATHER_TTL_SECONDS: z.coerce.number().default(21600),
  GEOCODE_REFRESH_SECONDS: z.coerce.number().default(15552000),
  EARTHQUAKE_TTL_SECONDS: z.coerce.number().default(21600),
});

export type Config = z.infer<typeof Env>;

export function createConfig(env: NodeJS.ProcessEnv): Readonly<Config> {
  return Object.freeze(Env.parse(env));
}

export const config: Readonly<Config> = createConfig(process.env);
