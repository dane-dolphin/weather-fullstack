import type { ApiSuccess } from '@/api/types';
import type { ViewModel } from './types';
import { categorize } from './weatherCode';
import { pickPrimaryAlert } from './alerts';

const CONDITION_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Drizzling',
  53: 'Drizzling',
  55: 'Drizzling',
  61: 'Rainy',
  63: 'Rainy',
  65: 'Heavy Rain',
  71: 'Snowy',
  73: 'Snowy',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

// api.weather must not be null — caller guards before invoking this
export function mapToViewModel(api: ApiSuccess): ViewModel {
  const weather = api.weather!;
  const code = weather.weatherCode ?? 0;
  const isDay = weather.isDay ?? true;

  const hourly = (weather.forecast ?? []).map((entry) => ({
    time: entry.time,
    temp: entry.temp,
    weatherCode: entry.weatherCode ?? 0,
    isDay: entry.isDay ?? isDay,
  }));

  return {
    isDay,
    category: categorize(code),
    location: api.location.city
      ? `${api.location.city}, ${api.location.state}`
      : api.location.state || null,
    time: new Date().toISOString(),
    condition: {
      label: CONDITION_LABELS[code] ?? 'Clear',
    },
    hero: {
      temperature: weather.currentTemp,
      feelsLike: weather.apparentTemp,
      hi: weather.high,
      lo: weather.low,
    },
    stats: {
      windSpeed: weather.windSpeed,
      windDirection: weather.windDirection,
      humidity: weather.humidity,
      pressure: weather.pressure ?? null,
    },
    hourly,
    alert: pickPrimaryAlert(api),
  };
}
