import { config } from '../lib/config.js';
import type { WeatherProvider } from './types.js';
import { OpenMeteoProvider } from './openMeteo.js';
import { GoogleProvider } from './google.js';

export function selectProvider(): WeatherProvider {
  switch (config.WEATHER_PROVIDER) {
    case 'open-meteo':
      return new OpenMeteoProvider();
    case 'google':
      return new GoogleProvider();
  }
}

// Module-scoped singleton — created once on cold start
export const weatherProvider: WeatherProvider = selectProvider();
