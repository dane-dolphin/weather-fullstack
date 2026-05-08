import type { ViewModel } from '@/domain/types';

const BASE_LOCATION = 'CA';
const BASE_TIME = '2026-05-08T14:30:00.000Z';

const DAY_CLEAR: ViewModel = {
  isDay: true,
  category: 'clear',
  location: BASE_LOCATION,
  time: BASE_TIME,
  condition: { label: 'Clear' },
  hero: { temperature: 72, feelsLike: 69, hi: 76, lo: 54 },
  stats: { windSpeed: 8, windDirection: 230, humidity: 52, pressure: 1013 },
  hourly: [
    { time: '2026-05-08T14:00', temp: 72, weatherCode: 0, isDay: true },
    { time: '2026-05-08T15:00', temp: 74, weatherCode: 1, isDay: true },
    { time: '2026-05-08T16:00', temp: 75, weatherCode: 0, isDay: true },
    { time: '2026-05-08T17:00', temp: 73, weatherCode: 2, isDay: true },
    { time: '2026-05-08T18:00', temp: 70, weatherCode: 1, isDay: true },
  ],
  alert: null,
};

const NIGHT_CLEAR: ViewModel = {
  isDay: false,
  category: 'clear',
  location: BASE_LOCATION,
  time: '2026-05-09T02:00:00.000Z',
  condition: { label: 'Clear' },
  hero: { temperature: 58, feelsLike: 55, hi: 76, lo: 52 },
  stats: { windSpeed: 5, windDirection: 270, humidity: 68, pressure: 1013 },
  hourly: [
    { time: '2026-05-09T02:00', temp: 58, weatherCode: 0, isDay: false },
    { time: '2026-05-09T03:00', temp: 56, weatherCode: 0, isDay: false },
    { time: '2026-05-09T04:00', temp: 55, weatherCode: 1, isDay: false },
    { time: '2026-05-09T05:00', temp: 54, weatherCode: 0, isDay: false },
    { time: '2026-05-09T06:00', temp: 56, weatherCode: 0, isDay: true },
  ],
  alert: null,
};

const SEVERE_ALERT = {
  kind: 'severe' as const,
  tag: 'SEVERE THUNDERSTORM WARNING',
  title: 'Severe Thunderstorm Warning in Effect',
  message:
    'The National Weather Service has issued a Severe Thunderstorm Warning for the area. Expect large hail and damaging winds.',
  meta: 'Until 6:15 PM',
  source: 'NWS',
};

const DAY_RAIN: ViewModel = {
  isDay: true,
  category: 'rain',
  location: BASE_LOCATION,
  time: BASE_TIME,
  condition: { label: 'Rainy' },
  hero: { temperature: 58, feelsLike: 54, hi: 62, lo: 50 },
  stats: { windSpeed: 14, windDirection: 180, humidity: 85, pressure: 1008 },
  hourly: [
    { time: '2026-05-08T14:00', temp: 58, weatherCode: 63, isDay: true },
    { time: '2026-05-08T15:00', temp: 57, weatherCode: 63, isDay: true },
    { time: '2026-05-08T16:00', temp: 56, weatherCode: 61, isDay: true },
    { time: '2026-05-08T17:00', temp: 55, weatherCode: 61, isDay: true },
    { time: '2026-05-08T18:00', temp: 54, weatherCode: 63, isDay: true },
  ],
  alert: null,
};

const DAY_RAIN_ALERT: ViewModel = { ...DAY_RAIN, alert: SEVERE_ALERT };

const NIGHT_RAIN_ALERT: ViewModel = {
  isDay: false,
  category: 'rain',
  location: BASE_LOCATION,
  time: '2026-05-09T01:00:00.000Z',
  condition: { label: 'Rainy' },
  hero: { temperature: 52, feelsLike: 48, hi: 62, lo: 50 },
  stats: { windSpeed: 18, windDirection: 200, humidity: 90, pressure: 1005 },
  hourly: [
    { time: '2026-05-09T01:00', temp: 52, weatherCode: 65, isDay: false },
    { time: '2026-05-09T02:00', temp: 51, weatherCode: 65, isDay: false },
    { time: '2026-05-09T03:00', temp: 51, weatherCode: 63, isDay: false },
    { time: '2026-05-09T04:00', temp: 50, weatherCode: 61, isDay: false },
    { time: '2026-05-09T05:00', temp: 50, weatherCode: 61, isDay: false },
  ],
  alert: SEVERE_ALERT,
};

const LANDSCAPE_DAY_ALERT: ViewModel = {
  isDay: true,
  category: 'thunder',
  location: BASE_LOCATION,
  time: BASE_TIME,
  condition: { label: 'Thunderstorm' },
  hero: { temperature: 68, feelsLike: 65, hi: 72, lo: 55 },
  stats: { windSpeed: 22, windDirection: 160, humidity: 80, pressure: 1003 },
  hourly: [
    { time: '2026-05-08T14:00', temp: 68, weatherCode: 95, isDay: true },
    { time: '2026-05-08T15:00', temp: 66, weatherCode: 95, isDay: true },
    { time: '2026-05-08T16:00', temp: 64, weatherCode: 96, isDay: true },
    { time: '2026-05-08T17:00', temp: 63, weatherCode: 95, isDay: true },
    { time: '2026-05-08T18:00', temp: 62, weatherCode: 63, isDay: true },
  ],
  alert: {
    kind: 'tornado',
    tag: 'TORNADO WARNING',
    title: 'Tornado Warning in Effect Until 6:30 PM',
    message:
      'A tornado warning has been issued. Take shelter immediately in a sturdy building away from windows.',
    meta: 'Until 6:30 PM',
    source: 'NWS',
  },
};

const PORTRAIT_QUAKE: ViewModel = {
  isDay: true,
  category: 'clear',
  location: BASE_LOCATION,
  time: BASE_TIME,
  condition: { label: 'Clear' },
  hero: { temperature: 70, feelsLike: 67, hi: 74, lo: 56 },
  stats: { windSpeed: 6, windDirection: 240, humidity: 55, pressure: 1013 },
  hourly: [
    { time: '2026-05-08T14:00', temp: 70, weatherCode: 0, isDay: true },
    { time: '2026-05-08T15:00', temp: 72, weatherCode: 0, isDay: true },
    { time: '2026-05-08T16:00', temp: 73, weatherCode: 1, isDay: true },
    { time: '2026-05-08T17:00', temp: 71, weatherCode: 1, isDay: true },
    { time: '2026-05-08T18:00', temp: 69, weatherCode: 0, isDay: true },
  ],
  alert: {
    kind: 'earthquake',
    tag: 'EARTHQUAKE',
    title: 'Magnitude 4.2 — 15 km NNE of San Jose, CA',
    message: 'USGS detected a M4.2 earthquake near 15 km NNE of San Jose, CA.',
    meta: '2:07 PM',
    source: 'USGS',
  },
};

const FIXTURES: Record<string, ViewModel> = {
  'day-clear': DAY_CLEAR,
  'day-clear-landscape': DAY_CLEAR,
  'night-clear': NIGHT_CLEAR,
  'day-rain': DAY_RAIN,
  'day-rain-alert': DAY_RAIN_ALERT,
  'night-rain-alert': NIGHT_RAIN_ALERT,
  'landscape-day-alert': LANDSCAPE_DAY_ALERT,
  'portrait-quake': PORTRAIT_QUAKE,
};

export function getFixture(key: string): ViewModel | null {
  return FIXTURES[key] ?? null;
}

export { FIXTURES };
