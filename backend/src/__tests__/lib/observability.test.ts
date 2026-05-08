import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';

const VALID_ENV: Record<string, string> = {
  NWS_USER_AGENT: 'weather-screens (ops@example.com)',
  NOMINATIM_USER_AGENT: 'weather-screens (ops@example.com)',
  GEOCODE_TABLE: 'geocode',
  WEATHER_TABLE: 'weather',
  ALERTS_TABLE: 'alerts',
  AWS_REGION: 'us-east-1',
};

let obs: typeof import('../../lib/observability.js');

beforeAll(async () => {
  Object.assign(process.env, VALID_ENV);
  jest.resetModules();
  obs = await import('../../lib/observability.js');
});

afterAll(() => {
  for (const key of Object.keys(VALID_ENV)) delete process.env[key];
});

describe('observability singletons', () => {
  test('logger is defined', () => {
    expect(obs.logger).toBeDefined();
  });

  test('tracer is defined', () => {
    expect(obs.tracer).toBeDefined();
  });

  test('metrics is defined', () => {
    expect(obs.metrics).toBeDefined();
  });
});
