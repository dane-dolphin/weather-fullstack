import { z } from 'zod';
import { config } from '../lib/config.js';
import { logger } from '../lib/observability.js';
import { UpstreamError, AppError, ConfigError } from '../lib/errors.js';
import type { WeatherSnapshot } from '../lib/schema.js';
import type { WeatherProvider } from './types.js';

// Google Weather API v1 response schemas (Maps Weather API, IMPERIAL units:
// Fahrenheit, MPH. airPressure.meanSeaLevelMillibars is always in millibars
// regardless of unitsSystem.)
const GoogleCurrentSchema = z.looseObject({
  currentConditions: z.looseObject({
    temperature: z.looseObject({ degrees: z.number() }),
    feelsLikeTemperature: z.looseObject({ degrees: z.number() }),
    humidity: z.number(),
    wind: z.looseObject({
      speed: z.looseObject({ value: z.number() }),
      direction: z.looseObject({ degrees: z.number() }),
    }),
    precipitation: z.looseObject({
      qpf: z.looseObject({ quantity: z.number() }),
    }),
    airPressure: z.looseObject({ meanSeaLevelMillibars: z.number() }),
  }),
});

const GoogleForecastSchema = z.looseObject({
  forecastDays: z
    .array(
      z.looseObject({
        maxTemperature: z.looseObject({ degrees: z.number() }),
        minTemperature: z.looseObject({ degrees: z.number() }),
      }),
    )
    .min(1),
});

export class GoogleProvider implements WeatherProvider {
  readonly name = 'google' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    if (!config.GOOGLE_WEATHER_API_KEY) {
      throw new ConfigError('GOOGLE_WEATHER_API_KEY is required when WEATHER_PROVIDER=google');
    }
    this.apiKey = config.GOOGLE_WEATHER_API_KEY;
    this.baseUrl = config.GOOGLE_WEATHER_BASE_URL;
  }

  async fetch(lat: number, lon: number): Promise<WeatherSnapshot> {
    const common = {
      key: this.apiKey,
      'location.latitude': String(lat),
      'location.longitude': String(lon),
      unitsSystem: 'IMPERIAL',
    };

    const currentUrl = `${this.baseUrl}/v1/currentConditions:lookup?${new URLSearchParams(common).toString()}`;
    const forecastUrl = `${this.baseUrl}/v1/forecast/days:lookup?${new URLSearchParams({ ...common, days: '1' }).toString()}`;

    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(currentUrl, { signal: AbortSignal.timeout(5000) }),
        fetch(forecastUrl, { signal: AbortSignal.timeout(5000) }),
      ]);

      if (!currentRes.ok) {
        logger.warn('google_current_non_2xx', { status: currentRes.status });
        throw new UpstreamError('google_weather_error', 502, `Google current: ${currentRes.status}`);
      }
      if (!forecastRes.ok) {
        logger.warn('google_forecast_non_2xx', { status: forecastRes.status });
        throw new UpstreamError('google_weather_error', 502, `Google forecast: ${forecastRes.status}`);
      }

      const [currentJson, forecastJson]: [unknown, unknown] = await Promise.all([
        currentRes.json(),
        forecastRes.json(),
      ]);

      const currentParsed = GoogleCurrentSchema.safeParse(currentJson);
      const forecastParsed = GoogleForecastSchema.safeParse(forecastJson);

      if (!currentParsed.success || !forecastParsed.success) {
        logger.warn('google_schema_mismatch', {
          currentOk: currentParsed.success,
          forecastOk: forecastParsed.success,
        });
        throw new UpstreamError('google_schema_error', 502, 'Google Weather response schema mismatch');
      }

      const curr = currentParsed.data.currentConditions;
      const fore = forecastParsed.data.forecastDays[0];

      return {
        high: fore.maxTemperature.degrees,
        low: fore.minTemperature.degrees,
        currentTemp: curr.temperature.degrees,
        apparentTemp: curr.feelsLikeTemperature.degrees,
        humidity: curr.humidity,
        precipitation: curr.precipitation.qpf.quantity,
        windSpeed: curr.wind.speed.value,
        windDirection: curr.wind.direction.degrees,
        pressure: curr.airPressure.meanSeaLevelMillibars,
        source: 'google',
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('google_weather_request_failed', { message });
      throw new UpstreamError('google_timeout', 502, 'Google Weather request failed');
    }
  }
}
