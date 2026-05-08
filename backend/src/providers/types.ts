import type { WeatherSnapshot } from '../lib/schema.js';

export interface WeatherProvider {
  readonly name: 'open-meteo' | 'google';
  fetch(lat: number, lon: number): Promise<WeatherSnapshot>;
}
