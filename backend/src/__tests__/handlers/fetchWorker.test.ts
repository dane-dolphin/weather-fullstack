import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import type { SQSEvent, Context } from 'aws-lambda';
import type { WeatherSnapshot } from '../../lib/schema.js';

// ── constants ────────────────────────────────────────────────────────────────

const WEATHER_TABLE = 'weather-table';

// ── mock data ─────────────────────────────────────────────────────────────────

const MOCK_SNAPSHOT: WeatherSnapshot = {
  high: 25,
  low: 15,
  currentTemp: 20,
  apparentTemp: 18,
  precipitation: 0,
  windSpeed: 10,
  windDirection: 180,
  humidity: 60,
  source: 'open-meteo',
  fetchedAt: '2026-05-05T12:00:00.000Z',
};

// ── mocks ────────────────────────────────────────────────────────────────────

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
  config: {
    WEATHER_TABLE,
  },
}));

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: {},
}));

const mockProviderFetch =
  jest.fn<(lat: number, lon: number) => Promise<WeatherSnapshot>>();
jest.unstable_mockModule('../../providers/index.js', () => ({
  weatherProvider: { fetch: mockProviderFetch },
}));

const mockWeatherRepoPut =
  jest.fn<(lat2dp: number, lon2dp: number, snapshot: WeatherSnapshot) => Promise<void>>();
jest.unstable_mockModule('../../repos/weatherRepo.js', () => ({
  WeatherRepo: jest.fn().mockImplementation(() => ({
    put: mockWeatherRepoPut,
  })),
}));

// ── module import (after all mocks are registered) ────────────────────────────

type BatchItemFailures = { batchItemFailures: Array<{ itemIdentifier: string }> };
type TestHandler = (event: SQSEvent, context: Context) => Promise<BatchItemFailures>;
let testHandler: TestHandler;

beforeAll(async () => {
  const mod = await import('../../handlers/fetchWorker.js');
  testHandler = mod.handler;
});

// ── helpers ───────────────────────────────────────────────────────────────────

const mockContext = {} as Context;

function makeSqsEvent(
  records: Array<{ messageId: string; body: string }>,
): SQSEvent {
  return {
    Records: records.map(({ messageId, body }) => ({
      messageId,
      receiptHandle: `receipt-${messageId}`,
      body,
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '1234567890',
        SenderId: 'sender',
        ApproximateFirstReceiveTimestamp: '1234567890',
      },
      messageAttributes: {},
      md5OfBody: 'abc123',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:weather.fifo',
      awsRegion: 'us-east-1',
    })),
  };
}

beforeEach(() => {
  mockProviderFetch.mockReset();
  mockWeatherRepoPut.mockReset();
  mockProviderFetch.mockResolvedValue(MOCK_SNAPSHOT);
  mockWeatherRepoPut.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('happy path', () => {
  test('valid cell key → provider fetched, weather stored, no batchItemFailures', async () => {
    const event = makeSqsEvent([{ messageId: 'msg-1', body: 'LL#40.71#-74.01' }]);

    const result = await testHandler(event, mockContext);

    expect(mockProviderFetch).toHaveBeenCalledWith(40.71, -74.01);
    expect(mockWeatherRepoPut).toHaveBeenCalledWith(40.71, -74.01, MOCK_SNAPSHOT);
    expect(result.batchItemFailures).toHaveLength(0);
  });

  test('multiple valid records → all stored, no failures', async () => {
    const event = makeSqsEvent([
      { messageId: 'msg-1', body: 'LL#40.71#-74.01' },
      { messageId: 'msg-2', body: 'LL#33.94#-118.41' },
    ]);

    const result = await testHandler(event, mockContext);

    expect(mockProviderFetch).toHaveBeenCalledTimes(2);
    expect(mockWeatherRepoPut).toHaveBeenCalledTimes(2);
    expect(result.batchItemFailures).toHaveLength(0);
  });
});

describe('per-record failure isolation', () => {
  test('bad cell key → that record in batchItemFailures, other records succeed', async () => {
    const event = makeSqsEvent([
      { messageId: 'msg-bad', body: 'INVALID_KEY' },
      { messageId: 'msg-good', body: 'LL#40.71#-74.01' },
    ]);

    const result = await testHandler(event, mockContext);

    // Bad record is in failures
    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-bad');

    // Good record was still processed
    expect(mockProviderFetch).toHaveBeenCalledWith(40.71, -74.01);
    expect(mockWeatherRepoPut).toHaveBeenCalledTimes(1);
  });

  test('provider throws → that record in batchItemFailures, other records succeed', async () => {
    mockProviderFetch
      .mockRejectedValueOnce(new Error('upstream timeout'))
      .mockResolvedValueOnce(MOCK_SNAPSHOT);

    const event = makeSqsEvent([
      { messageId: 'msg-fail', body: 'LL#40.71#-74.01' },
      { messageId: 'msg-ok', body: 'LL#33.94#-118.41' },
    ]);

    const result = await testHandler(event, mockContext);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-fail');

    // Second record processed successfully
    expect(mockWeatherRepoPut).toHaveBeenCalledTimes(1);
    expect(mockWeatherRepoPut).toHaveBeenCalledWith(33.94, -118.41, MOCK_SNAPSHOT);
  });

  test('weatherRepo.put throws → that record in batchItemFailures, other records succeed', async () => {
    mockWeatherRepoPut
      .mockRejectedValueOnce(new Error('DDB write error'))
      .mockResolvedValueOnce(undefined);

    const event = makeSqsEvent([
      { messageId: 'msg-ddb-fail', body: 'LL#40.71#-74.01' },
      { messageId: 'msg-ok', body: 'LL#33.94#-118.41' },
    ]);

    const result = await testHandler(event, mockContext);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-ddb-fail');
    expect(mockWeatherRepoPut).toHaveBeenCalledTimes(2);
  });
});

describe('withObservability chain', () => {
  test('wrapped handler invocation runs end-to-end (middleware chain exercised)', async () => {
    const event = makeSqsEvent([{ messageId: 'msg-1', body: 'LL#40.71#-74.01' }]);

    // This test exists to ensure the wrapped `handler` (not bare `baseHandler`) is invoked,
    // giving the withObservability middleware chain its first coverage in Phase 5.
    const result = await testHandler(event, mockContext);
    expect(result.batchItemFailures).toHaveLength(0);
  });
});
