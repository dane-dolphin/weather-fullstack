import { describe, test, expect, afterEach, jest } from '@jest/globals';

// All imports of config.ts are dynamic — the module init runs createConfig(process.env)
// at load time, so we must set process.env BEFORE the dynamic import.

const VALID: Record<string, string> = {
  NWS_USER_AGENT: 'weather-screens (ops@example.com)',
  NOMINATIM_USER_AGENT: 'weather-screens (ops@example.com)',
  GEOCODE_TABLE: 'geocode',
  WEATHER_TABLE: 'weather',
  ALERTS_TABLE: 'alerts',
  AWS_REGION: 'us-east-1',
};

const VALID_KEYS = Object.keys(VALID);

afterEach(() => {
  // Remove the keys we added so they don't bleed into other tests.
  for (const key of VALID_KEYS) delete process.env[key];
  jest.resetModules();
});

async function loadConfig(env: Record<string, string>) {
  Object.assign(process.env, env);
  jest.resetModules();
  return import('../../lib/config.js');
}

describe('Env schema — validation', () => {
  test('parses minimal valid env and applies defaults', async () => {
    const { Env } = await loadConfig(VALID);
    const result = Env.parse(VALID);
    expect(result.WEATHER_PROVIDER).toBe('open-meteo');
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.WEATHER_FRESH_SECONDS).toBe(7200);
    expect(result.WEATHER_TTL_SECONDS).toBe(21600);
    expect(result.GEOCODE_REFRESH_SECONDS).toBe(15552000);
    expect(result.EARTHQUAKE_TTL_SECONDS).toBe(21600);
  });

  test('throws on missing NWS_USER_AGENT', async () => {
    const { Env } = await loadConfig(VALID);
    const { NWS_USER_AGENT: _omit, ...rest } = VALID;
    expect(() => Env.parse(rest)).toThrow();
  });

  test('throws when NWS_USER_AGENT is too short (< 5 chars)', async () => {
    const { Env } = await loadConfig(VALID);
    expect(() => Env.parse({ ...VALID, NWS_USER_AGENT: 'abc' })).toThrow();
  });

  test('throws on missing GEOCODE_TABLE', async () => {
    const { Env } = await loadConfig(VALID);
    const { GEOCODE_TABLE: _omit, ...rest } = VALID;
    expect(() => Env.parse(rest)).toThrow();
  });

  test('throws on missing WEATHER_TABLE', async () => {
    const { Env } = await loadConfig(VALID);
    const { WEATHER_TABLE: _omit, ...rest } = VALID;
    expect(() => Env.parse(rest)).toThrow();
  });

  test('throws on missing ALERTS_TABLE', async () => {
    const { Env } = await loadConfig(VALID);
    const { ALERTS_TABLE: _omit, ...rest } = VALID;
    expect(() => Env.parse(rest)).toThrow();
  });

  test('throws on missing AWS_REGION', async () => {
    const { Env } = await loadConfig(VALID);
    const { AWS_REGION: _omit, ...rest } = VALID;
    expect(() => Env.parse(rest)).toThrow();
  });

  test('throws on invalid WEATHER_PROVIDER', async () => {
    const { Env } = await loadConfig(VALID);
    expect(() => Env.parse({ ...VALID, WEATHER_PROVIDER: 'unknown' })).toThrow();
  });

  test('throws on invalid LOG_LEVEL', async () => {
    const { Env } = await loadConfig(VALID);
    expect(() => Env.parse({ ...VALID, LOG_LEVEL: 'verbose' })).toThrow();
  });

  test('coerces WEATHER_FRESH_SECONDS from string', async () => {
    const { Env } = await loadConfig(VALID);
    const result = Env.parse({ ...VALID, WEATHER_FRESH_SECONDS: '3600' });
    expect(result.WEATHER_FRESH_SECONDS).toBe(3600);
  });

  test('WEATHER_QUEUE_URL is optional', async () => {
    const { Env } = await loadConfig(VALID);
    const result = Env.parse(VALID);
    expect(result.WEATHER_QUEUE_URL).toBeUndefined();
  });

  test('GOOGLE_WEATHER_API_KEY is optional', async () => {
    const { Env } = await loadConfig(VALID);
    const result = Env.parse(VALID);
    expect(result.GOOGLE_WEATHER_API_KEY).toBeUndefined();
  });
});

describe('createConfig', () => {
  test('returns frozen object', async () => {
    const { createConfig } = await loadConfig(VALID);
    const cfg = createConfig(VALID);
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  test('frozen object prevents mutation in strict mode', async () => {
    const { createConfig } = await loadConfig(VALID);
    const cfg = createConfig(VALID);
    expect(() => {
      (cfg as Record<string, unknown>).LOG_LEVEL = 'debug';
    }).toThrow(TypeError);
  });

  test('throws on invalid env', async () => {
    const { createConfig } = await loadConfig(VALID);
    expect(() => createConfig({ AWS_REGION: 'us-east-1' })).toThrow();
  });
});

describe('module-level config singleton', () => {
  test('config is frozen after module load', async () => {
    const { config } = await loadConfig(VALID);
    expect(Object.isFrozen(config)).toBe(true);
  });

  test('module throws during init when required env vars are missing', async () => {
    // Do NOT set env vars — module should throw.
    jest.resetModules();
    await expect(import('../../lib/config.js')).rejects.toThrow();
  });
});
