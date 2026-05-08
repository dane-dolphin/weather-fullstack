import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import type { Context } from 'aws-lambda';
import type { Earthquake } from '../../lib/schema.js';

// ── constants ─────────────────────────────────────────────────────────────────

const ALERTS_TABLE = 'test-alerts-table';

// ── mocks (before any dynamic import) ────────────────────────────────────────

// Powertools middleware replaced with passthrough no-ops.
// Middy v7 requires at least one hook key; bare {} throws. Use { before } no-op.
jest.unstable_mockModule('@aws-lambda-powertools/logger/middleware', () => ({
  injectLambdaContext: () => ({ before: () => undefined }),
}));
jest.unstable_mockModule('@aws-lambda-powertools/tracer/middleware', () => ({
  captureLambdaHandler: () => ({ before: () => undefined }),
}));
jest.unstable_mockModule('@aws-lambda-powertools/metrics/middleware', () => ({
  logMetrics: () => ({ before: () => undefined }),
}));

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: { ALERTS_TABLE },
}));

const mockLogger = {
  info: jest.fn<(...args: unknown[]) => void>(),
  warn: jest.fn<(...args: unknown[]) => void>(),
  error: jest.fn<(...args: unknown[]) => void>(),
};
jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: { addMetric: jest.fn() },
}));

const mockFetchSignificantQuakes = jest.fn<() => Promise<Earthquake[]>>();
jest.unstable_mockModule('../../providers/usgs.js', () => ({
  fetchSignificantQuakes: mockFetchSignificantQuakes,
}));

const mockPutEarthquake = jest.fn<(eq: Earthquake) => Promise<void>>();
jest.unstable_mockModule('../../repos/alertsRepo.js', () => ({
  AlertsRepo: jest.fn().mockImplementation(() => ({
    putEarthquake: mockPutEarthquake,
  })),
}));

// ── module import (after all mocks registered) ───────────────────────────────

// withObservability returns MiddyfiedHandler<unknown, void> which structurally matches
// (event: unknown, context: Context) => Promise<void>. Direct assignment — no assertion.
type TestHandler = (event: unknown, context: Context) => Promise<void>;
let testHandler: TestHandler;

beforeAll(async () => {
  const mod = await import('../../handlers/earthquakePoller.js');
  testHandler = mod.handler;
});

// ── helpers ───────────────────────────────────────────────────────────────────

const mockContext = {} as Context;

function makeQuake(id: string): Earthquake {
  return {
    quake_id: id,
    magnitude: 6.1,
    place: '150 km ENE of Kamaishi, Japan',
    time: 1735689600000,
    lon: 142.5,
    lat: 39.2,
  };
}

beforeEach(() => {
  mockFetchSignificantQuakes.mockReset();
  mockPutEarthquake.mockReset();
  mockLogger.info.mockReset();
  mockLogger.warn.mockReset();
  mockPutEarthquake.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('earthquakePoller handler', () => {
  test('stores each earthquake and logs completion', async () => {
    const quakes = [makeQuake('quake-1'), makeQuake('quake-2')];
    mockFetchSignificantQuakes.mockResolvedValue(quakes);

    await testHandler({}, mockContext);

    expect(mockPutEarthquake).toHaveBeenCalledTimes(2);
    expect(mockPutEarthquake).toHaveBeenCalledWith(quakes[0]);
    expect(mockPutEarthquake).toHaveBeenCalledWith(quakes[1]);
    expect(mockLogger.info).toHaveBeenCalledWith('earthquake_poll_complete', { count: 2 });
  });

  test('empty feed → no putEarthquake calls, logs count 0', async () => {
    mockFetchSignificantQuakes.mockResolvedValue([]);

    await testHandler({}, mockContext);

    expect(mockPutEarthquake).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('earthquake_poll_complete', { count: 0 });
  });

  test('fetchSignificantQuakes throws → error propagates out of handler', async () => {
    mockFetchSignificantQuakes.mockRejectedValue(new Error('USGS unreachable'));

    await expect(testHandler({}, mockContext)).rejects.toThrow('USGS unreachable');
  });

  test('wrapped handler (withObservability) runs end-to-end without error', async () => {
    mockFetchSignificantQuakes.mockResolvedValue([]);

    // Invoking the wrapped export exercises the full middleware chain (injectLambdaContext,
    // captureLambdaHandler, logMetrics). These are mocked as no-ops but the chain still runs.
    await expect(testHandler({}, mockContext)).resolves.toBeUndefined();
  });
});
