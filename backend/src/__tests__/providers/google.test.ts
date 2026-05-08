import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';

// Register mocks BEFORE any dynamic import of the module under test.
jest.unstable_mockModule('../../lib/config.js', () => ({
  config: {
    GOOGLE_WEATHER_API_KEY: 'test-api-key',
    GOOGLE_WEATHER_BASE_URL: 'https://weather.googleapis.com',
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

let GoogleProvider: typeof import('../../providers/google.js').GoogleProvider;
let UpstreamError: typeof import('../../lib/errors.js').UpstreamError;

beforeAll(async () => {
  globalThis.fetch = mockFetch;
  ({ GoogleProvider } = await import('../../providers/google.js'));
  ({ UpstreamError } = await import('../../lib/errors.js'));
});

afterEach(() => {
  mockFetch.mockReset();
});

const CURRENT_FIXTURE = {
  currentConditions: {
    temperature: { degrees: 72.5, unit: 'FAHRENHEIT' },
    feelsLikeTemperature: { degrees: 70.0, unit: 'FAHRENHEIT' },
    humidity: 65,
    wind: {
      speed: { value: 12.0, unit: 'MILES_PER_HOUR' },
      direction: { degrees: 180, cardinal: 'S' },
    },
    precipitation: {
      qpf: { quantity: 0.1, unit: 'INCHES' },
    },
    airPressure: { meanSeaLevelMillibars: 1013.2 },
  },
};

const FORECAST_FIXTURE = {
  forecastDays: [
    {
      maxTemperature: { degrees: 80.6, unit: 'FAHRENHEIT' },
      minTemperature: { degrees: 62.6, unit: 'FAHRENHEIT' },
    },
  ],
};

describe('GoogleProvider', () => {
  describe('fetch', () => {
    test('maps fixture fields to WeatherSnapshot field-by-field', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(CURRENT_FIXTURE),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FORECAST_FIXTURE),
        } as Response);

      const provider = new GoogleProvider();
      const result = await provider.fetch(40.71, -74.01);

      expect(result.high).toBe(80.6);
      expect(result.low).toBe(62.6);
      expect(result.currentTemp).toBe(72.5);
      expect(result.apparentTemp).toBe(70.0);
      expect(result.humidity).toBe(65);
      expect(result.precipitation).toBe(0.1);
      expect(result.windSpeed).toBe(12.0);
      expect(result.windDirection).toBe(180);
      expect(result.pressure).toBe(1013.2);
      expect(result.source).toBe('google');
      expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('builds correct URLs with key and location params', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(CURRENT_FIXTURE),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FORECAST_FIXTURE),
        } as Response);

      const provider = new GoogleProvider();
      await provider.fetch(40.71, -74.01);

      const calls = mockFetch.mock.calls as [string, ...unknown[]][];
      const currentUrl = calls[0][0];
      const forecastUrl = calls[1][0];

      expect(currentUrl).toContain('currentConditions:lookup');
      expect(currentUrl).toContain('key=test-api-key');
      expect(forecastUrl).toContain('forecast/days:lookup');
      expect(forecastUrl).toContain('days=1');
    });

    test('throws UpstreamError when current conditions returns non-2xx', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 403 } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FORECAST_FIXTURE),
        } as Response);

      const provider = new GoogleProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
      expect((err as InstanceType<typeof UpstreamError>).code).toBe('google_weather_error');
    });

    test('throws UpstreamError on schema mismatch (missing currentConditions.temperature)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              currentConditions: { humidity: 65 }, // missing temperature, feelsLike, wind, precipitation
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FORECAST_FIXTURE),
        } as Response);

      const provider = new GoogleProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).code).toBe('google_schema_error');
    });

    test('throws UpstreamError when forecast days returns non-2xx', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(CURRENT_FIXTURE),
        } as Response)
        .mockResolvedValueOnce({ ok: false, status: 503 } as Response);

      const provider = new GoogleProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
      expect((err as InstanceType<typeof UpstreamError>).code).toBe('google_weather_error');
    });

    test('throws UpstreamError on timeout / network failure', async () => {
      const timeoutErr = Object.assign(new Error('signal timed out'), { name: 'TimeoutError' });
      mockFetch.mockRejectedValue(timeoutErr);

      const provider = new GoogleProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
    });

    test('throws UpstreamError when a non-Error value is thrown', async () => {
      // Exercises the String(err) branch of the ternary in the catch block
      mockFetch.mockRejectedValue('connection refused');

      const provider = new GoogleProvider();
      const err = await provider.fetch(40.71, -74.01).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as InstanceType<typeof UpstreamError>).status).toBe(502);
    });
  });
});
