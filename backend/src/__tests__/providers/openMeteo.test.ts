import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';

// Register mocks BEFORE any dynamic import of the module under test.
jest.unstable_mockModule('../../lib/config.js', () => ({
  config: {
    OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1',
  },
}));

jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFetch = jest.fn<typeof fetch>();

let OpenMeteoProvider: typeof import('../../providers/openMeteo.js').OpenMeteoProvider;
let UpstreamError: typeof import('../../lib/errors.js').UpstreamError;

beforeAll(async () => {
  globalThis.fetch = mockFetch;
  ({ OpenMeteoProvider } = await import('../../providers/openMeteo.js'));
  ({ UpstreamError } = await import('../../lib/errors.js'));
});

afterEach(() => {
  mockFetch.mockReset();
});

const FIXTURE = {
  current: {
    temperature_2m: 22.5,
    apparent_temperature: 21.0,
    relative_humidity_2m: 65,
    precipitation: 0.1,
    wind_speed_10m: 12.0,
    wind_direction_10m: 180,
    pressure_msl: 1013.2,
    weather_code: 1,
    is_day: 1,
    // extra fields Open-Meteo returns — should be tolerated by z.looseObject
    time: '2024-01-01T12:00',
  },
  hourly: {
    time: ['2024-01-01T12:00', '2024-01-01T13:00'],
    temperature_2m: [22.5, 23.0],
    weather_code: [1, 2],
    is_day: [1, 1],
    precipitation_probability: [10, 15],
  },
  daily: {
    temperature_2m_max: [27.0],
    temperature_2m_min: [17.0],
    sunrise: ['2024-01-01T07:15'],
    sunset: ['2024-01-01T16:45'],
    weather_code: [1],
    time: ['2024-01-01'],
  },
};

describe('OpenMeteoProvider', () => {
  describe('fetch', () => {
    test('maps fixture fields to WeatherSnapshot field-by-field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(FIXTURE),
      } as Response);

      const provider = new OpenMeteoProvider();
      const result = await provider.fetch(40.71, -74.01);

      expect(result.high).toBe(27.0);
      expect(result.low).toBe(17.0);
      expect(result.currentTemp).toBe(22.5);
      expect(result.apparentTemp).toBe(21.0);
      expect(result.humidity).toBe(65);
      expect(result.precipitation).toBe(0.1);
      expect(result.windSpeed).toBe(12.0);
      expect(result.windDirection).toBe(180);
      expect(result.pressure).toBe(1013.2);
      expect(result.source).toBe('open-meteo');
      expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('builds correct URL with required query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(FIXTURE),
      } as Response);

      const provider = new OpenMeteoProvider();
      await provider.fetch(40.71, -74.01);

      const calledUrl = (mockFetch.mock.calls[0] as [string, ...unknown[]])[0];
      expect(calledUrl).toContain('latitude=40.71');
      expect(calledUrl).toContain('longitude=-74.01');
      expect(calledUrl).toContain('temperature_unit=fahrenheit');
      expect(calledUrl).toContain('wind_speed_unit=mph');
      expect(calledUrl).toContain('pressure_msl');
      expect(calledUrl).toContain('forecast_days=1');
    });

    test('throws UpstreamError on non-2xx response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      const provider = new OpenMeteoProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
      expect((err as InstanceType<typeof UpstreamError>).code).toBe('open_meteo_error');
    });

    test('throws UpstreamError on schema mismatch (missing current.temperature_2m)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            current: { apparent_temperature: 21 }, // missing temperature_2m
            daily: { temperature_2m_max: [27], temperature_2m_min: [17] },
          }),
      } as Response);

      const provider = new OpenMeteoProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).code).toBe('open_meteo_schema_error');
    });

    test('throws UpstreamError on timeout / network failure', async () => {
      const timeoutErr = Object.assign(new Error('signal timed out'), { name: 'TimeoutError' });
      mockFetch.mockRejectedValue(timeoutErr);

      const provider = new OpenMeteoProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
    });

    test('throws UpstreamError when a non-Error value is thrown (e.g. string rejection)', async () => {
      // Exercises the String(err) branch of the ternary in the catch block
      mockFetch.mockRejectedValue('network gone');

      const provider = new OpenMeteoProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
    });
  });
});
