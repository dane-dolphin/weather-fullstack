import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// No top-level imports of modules under test — each test resets modules and re-imports.

describe('selectProvider factory', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('returns OpenMeteoProvider when WEATHER_PROVIDER=open-meteo', async () => {
    jest.unstable_mockModule('../../lib/config.js', () => ({
      config: {
        WEATHER_PROVIDER: 'open-meteo',
        OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1',
      },
    }));
    jest.unstable_mockModule('../../lib/observability.js', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    const { selectProvider } = await import('../../providers/index.js');
    const provider = selectProvider();

    expect(provider.name).toBe('open-meteo');
  });

  test('returns GoogleProvider when WEATHER_PROVIDER=google with key present', async () => {
    jest.unstable_mockModule('../../lib/config.js', () => ({
      config: {
        WEATHER_PROVIDER: 'google',
        GOOGLE_WEATHER_API_KEY: 'test-key',
        GOOGLE_WEATHER_BASE_URL: 'https://weather.googleapis.com',
      },
    }));
    jest.unstable_mockModule('../../lib/observability.js', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    const { selectProvider } = await import('../../providers/index.js');
    const provider = selectProvider();

    expect(provider.name).toBe('google');
  });

  test('throws ConfigError at module load when WEATHER_PROVIDER=google and key is missing', async () => {
    jest.unstable_mockModule('../../lib/config.js', () => ({
      config: {
        WEATHER_PROVIDER: 'google',
        GOOGLE_WEATHER_API_KEY: undefined,
        GOOGLE_WEATHER_BASE_URL: 'https://weather.googleapis.com',
      },
    }));
    jest.unstable_mockModule('../../lib/observability.js', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    // Importing index.ts creates the module-scoped weatherProvider singleton, which calls
    // selectProvider(), which calls new GoogleProvider() — that throws ConfigError.
    const err = await import('../../providers/index.js').catch((e: unknown) => e);

    expect(err).toMatchObject({ status: 500, code: 'config_error' });
  });

  test('module-scoped weatherProvider singleton is the correct type', async () => {
    jest.unstable_mockModule('../../lib/config.js', () => ({
      config: {
        WEATHER_PROVIDER: 'open-meteo',
        OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1',
      },
    }));
    jest.unstable_mockModule('../../lib/observability.js', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    const { weatherProvider } = await import('../../providers/index.js');

    expect(weatherProvider.name).toBe('open-meteo');
  });
});
