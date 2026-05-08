import { z } from 'zod';
import { config } from '../lib/config.js';
import { logger } from '../lib/observability.js';
import { UpstreamError, AppError } from '../lib/errors.js';
import type { WeatherSnapshot } from '../lib/schema.js';
import type { WeatherProvider } from './types.js';

const OpenMeteoResponseSchema = z.looseObject({
  current: z.looseObject({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    precipitation: z.number(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number(),
    pressure_msl: z.number(),
    weather_code: z.number(),
    is_day: z.number().int().min(0).max(1),
  }),
  hourly: z.looseObject({
    time: z.array(z.string()).min(1),
    temperature_2m: z.array(z.number()).min(1),
    weather_code: z.array(z.number()).min(1),
    is_day: z.array(z.number()).min(1),
    precipitation_probability: z.array(z.number()).min(1),
  }),
  daily: z.looseObject({
    temperature_2m_max: z.array(z.number()).min(1),
    temperature_2m_min: z.array(z.number()).min(1),
    sunrise: z.array(z.string()).min(1),
    sunset: z.array(z.string()).min(1),
    weather_code: z.array(z.number()).min(1),
  }),
});

export class OpenMeteoProvider implements WeatherProvider {
  readonly name = 'open-meteo' as const;

  async fetch(lat: number, lon: number): Promise<WeatherSnapshot> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code,is_day',
      hourly: 'temperature_2m,weather_code,is_day,precipitation_probability',
      daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      precipitation_unit: 'mm',
      timezone: 'auto',
      forecast_days: '1',
      forecast_hours: '5',
    });

    const url = `${config.OPEN_METEO_BASE_URL}/forecast?${params.toString()}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!res.ok) {
        logger.warn('open_meteo_non_2xx', { status: res.status, url });
        throw new UpstreamError('open_meteo_error', 502, `Open-Meteo: ${res.status}`);
      }

      const json: unknown = await res.json();
      const parsed = OpenMeteoResponseSchema.safeParse(json);

      if (!parsed.success) {
        logger.warn('open_meteo_schema_mismatch', { error: z.prettifyError(parsed.error) });
        throw new UpstreamError('open_meteo_schema_error', 502, 'Open-Meteo response schema mismatch');
      }

      const { current, hourly, daily } = parsed.data;
      const forecast = hourly.time.map((time, i) => ({
        time,
        temp: hourly.temperature_2m[i],
        weatherCode: hourly.weather_code[i],
        isDay: hourly.is_day[i] === 1,
        precipProbability: hourly.precipitation_probability[i],
      }));
      return {
        high: daily.temperature_2m_max[0],
        low: daily.temperature_2m_min[0],
        currentTemp: current.temperature_2m,
        apparentTemp: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        pressure: current.pressure_msl,
        weatherCode: current.weather_code,
        isDay: current.is_day === 1,
        sunrise: daily.sunrise[0],
        sunset: daily.sunset[0],
        dailyWeatherCode: daily.weather_code[0],
        forecast,
        source: 'open-meteo',
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('open_meteo_request_failed', { message });
      throw new UpstreamError('open_meteo_timeout', 502, 'Open-Meteo request failed');
    }
  }
}
