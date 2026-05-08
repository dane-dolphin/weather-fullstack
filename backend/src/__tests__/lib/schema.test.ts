import { describe, test, expect } from '@jest/globals';
import {
  WeatherSnapshotSchema,
  AlertSchema,
  EarthquakeSchema,
  GeocodeEntrySchema,
  WeatherQuerySchema,
} from '../../lib/schema.js';

const VALID_SNAPSHOT = {
  high: 30,
  low: 20,
  currentTemp: 25,
  apparentTemp: 24,
  precipitation: 0,
  windSpeed: 10,
  windDirection: 180,
  humidity: 60,
  source: 'open-meteo',
  fetchedAt: '2024-01-01T00:00:00Z',
};

const VALID_ALERT = {
  alert_id: 'abc123',
  state: 'NY',
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: 'Tornado warning in effect',
  description: null,
  affected_zones: ['NYZ072'],
  is_state_wide: false,
  effective: '2024-01-01T00:00:00Z',
  expires: '2024-01-01T06:00:00Z',
  source: 'nws',
};

const VALID_EARTHQUAKE = {
  quake_id: 'eq123',
  magnitude: 4.5,
  place: 'Central CA',
  time: 1700000000,
  lat: 37.5,
  lon: -122.1,
};

const VALID_GEOCODE = {
  lat_2dp: 40.71,
  lon_2dp: -74.01,
  state: 'NY',
  county_zone: 'NYC001',
  forecast_zone: 'NYZ072',
  fire_weather_zone: 'NYZ072',
  cwa: 'OKX',
  grid_id: 'OKX',
  grid_x: 32,
  grid_y: 34,
  time_zone: 'America/New_York',
  resolved_at: 1700000000,
};

describe('WeatherSnapshotSchema', () => {
  test('parses valid snapshot', () => {
    expect(() => WeatherSnapshotSchema.parse(VALID_SNAPSHOT)).not.toThrow();
  });

  test('rejects negative precipitation', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, precipitation: -1 })).toThrow();
  });

  test('rejects negative windSpeed', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, windSpeed: -5 })).toThrow();
  });

  test('rejects windDirection > 360', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, windDirection: 361 })).toThrow();
  });

  test('rejects windDirection < 0', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, windDirection: -1 })).toThrow();
  });

  test('rejects humidity > 100', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, humidity: 101 })).toThrow();
  });

  test('rejects humidity < 0', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, humidity: -1 })).toThrow();
  });

  test('rejects invalid source', () => {
    expect(() => WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, source: 'unknown' })).toThrow();
  });

  test('accepts google as source', () => {
    const result = WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, source: 'google' });
    expect(result.source).toBe('google');
  });

  test('rejects invalid fetchedAt', () => {
    expect(() =>
      WeatherSnapshotSchema.parse({ ...VALID_SNAPSHOT, fetchedAt: 'not-a-date' }),
    ).toThrow();
  });
});

describe('AlertSchema', () => {
  test('parses valid alert', () => {
    expect(() => AlertSchema.parse(VALID_ALERT)).not.toThrow();
  });

  test('parses with null headline and description', () => {
    const result = AlertSchema.parse({ ...VALID_ALERT, headline: null, description: null });
    expect(result.headline).toBeNull();
  });

  test('rejects invalid severity', () => {
    expect(() => AlertSchema.parse({ ...VALID_ALERT, severity: 'High' })).toThrow();
  });

  test('rejects state longer than 2 chars', () => {
    expect(() => AlertSchema.parse({ ...VALID_ALERT, state: 'NEW' })).toThrow();
  });

  test('rejects state shorter than 2 chars', () => {
    expect(() => AlertSchema.parse({ ...VALID_ALERT, state: 'N' })).toThrow();
  });

  test('rejects invalid source', () => {
    expect(() => AlertSchema.parse({ ...VALID_ALERT, source: 'fema' })).toThrow();
  });

  test('accepts all severity levels', () => {
    for (const severity of ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']) {
      expect(() => AlertSchema.parse({ ...VALID_ALERT, severity })).not.toThrow();
    }
  });
});

describe('EarthquakeSchema', () => {
  test('parses valid earthquake', () => {
    expect(() => EarthquakeSchema.parse(VALID_EARTHQUAKE)).not.toThrow();
  });

  test('returns correct shape', () => {
    const result = EarthquakeSchema.parse(VALID_EARTHQUAKE);
    expect(result.quake_id).toBe('eq123');
    expect(result.magnitude).toBe(4.5);
  });

  test('rejects missing magnitude', () => {
    const { magnitude: _omit, ...rest } = VALID_EARTHQUAKE;
    expect(() => EarthquakeSchema.parse(rest)).toThrow();
  });

  test('rejects missing quake_id', () => {
    const { quake_id: _omit, ...rest } = VALID_EARTHQUAKE;
    expect(() => EarthquakeSchema.parse(rest)).toThrow();
  });
});

describe('GeocodeEntrySchema', () => {
  test('parses valid entry', () => {
    expect(() => GeocodeEntrySchema.parse(VALID_GEOCODE)).not.toThrow();
  });

  test('accepts optional radar_station', () => {
    const result = GeocodeEntrySchema.parse({ ...VALID_GEOCODE, radar_station: 'KOKX' });
    expect(result.radar_station).toBe('KOKX');
  });

  test('radar_station absent → undefined', () => {
    const result = GeocodeEntrySchema.parse(VALID_GEOCODE);
    expect(result.radar_station).toBeUndefined();
  });

  test('rejects non-integer grid_x', () => {
    expect(() => GeocodeEntrySchema.parse({ ...VALID_GEOCODE, grid_x: 1.5 })).toThrow();
  });

  test('rejects non-integer grid_y', () => {
    expect(() => GeocodeEntrySchema.parse({ ...VALID_GEOCODE, grid_y: 1.5 })).toThrow();
  });

  test('rejects state != 2 chars', () => {
    expect(() => GeocodeEntrySchema.parse({ ...VALID_GEOCODE, state: 'NEW' })).toThrow();
  });
});

describe('WeatherQuerySchema', () => {
  test('coerces string lat/lon to numbers', () => {
    const result = WeatherQuerySchema.parse({ lat: '40.71', lon: '-74.01' });
    expect(result.lat).toBe(40.71);
    expect(result.lon).toBe(-74.01);
  });

  test('accepts numeric lat/lon directly', () => {
    const result = WeatherQuerySchema.parse({ lat: 40.71, lon: -74.01 });
    expect(result.lat).toBe(40.71);
  });

  test('rejects lat > 90', () => {
    expect(() => WeatherQuerySchema.parse({ lat: '91', lon: '0' })).toThrow();
  });

  test('rejects lat < -90', () => {
    expect(() => WeatherQuerySchema.parse({ lat: '-91', lon: '0' })).toThrow();
  });

  test('rejects lon > 180', () => {
    expect(() => WeatherQuerySchema.parse({ lat: '0', lon: '181' })).toThrow();
  });

  test('rejects lon < -180', () => {
    expect(() => WeatherQuerySchema.parse({ lat: '0', lon: '-181' })).toThrow();
  });
});
