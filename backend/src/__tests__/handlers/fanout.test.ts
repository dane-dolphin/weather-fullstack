import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import type { Context } from 'aws-lambda';

// ── constants ────────────────────────────────────────────────────────────────

const GEOCODE_TABLE = 'geocode-table';
const WEATHER_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/weather.fifo';

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
    GEOCODE_TABLE,
    WEATHER_QUEUE_URL,
  },
}));

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: {},
}));

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

// ── module import (after all mocks are registered) ────────────────────────────

type TestHandler = (event: unknown, context: Context) => Promise<void>;
let testHandler: TestHandler;

beforeAll(async () => {
  const mod = await import('../../handlers/fanout.js');
  testHandler = mod.handler;
});

// ── helpers ───────────────────────────────────────────────────────────────────

const mockContext = {} as Context;

function makeCellItems(count: number): Array<{ pk: string }> {
  return Array.from({ length: count }, (_, i) => ({
    pk: `LL#${(40 + i).toFixed(2)}#-74.01`,
  }));
}

beforeEach(() => {
  ddbMock.reset();
  sqsMock.reset();
  sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [], Failed: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('fanout batching', () => {
  test('30 cells → 3 SendMessageBatch calls of 10 entries each', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: makeCellItems(30),
      LastEvaluatedKey: undefined,
    });

    await testHandler({}, mockContext);

    const sqsCalls = sqsMock.commandCalls(SendMessageBatchCommand);
    expect(sqsCalls).toHaveLength(3);
    expect(sqsCalls[0].args[0].input.Entries).toHaveLength(10);
    expect(sqsCalls[1].args[0].input.Entries).toHaveLength(10);
    expect(sqsCalls[2].args[0].input.Entries).toHaveLength(10);
  });

  test('3 cells → 1 SendMessageBatch call of 3 entries', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: makeCellItems(3),
      LastEvaluatedKey: undefined,
    });

    await testHandler({}, mockContext);

    const sqsCalls = sqsMock.commandCalls(SendMessageBatchCommand);
    expect(sqsCalls).toHaveLength(1);
    expect(sqsCalls[0].args[0].input.Entries).toHaveLength(3);
  });

  test('message bodies are the correct cell keys', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [{ pk: 'LL#40.71#-74.01' }],
      LastEvaluatedKey: undefined,
    });

    await testHandler({}, mockContext);

    const sqsCalls = sqsMock.commandCalls(SendMessageBatchCommand);
    expect(sqsCalls).toHaveLength(1);
    const entry = sqsCalls[0].args[0].input.Entries?.[0];
    expect(entry?.MessageBody).toBe('LL#40.71#-74.01');
    expect(entry?.MessageGroupId).toBe('LL#40.71#-74.01');
    expect(entry?.MessageDeduplicationId).toBe('LL#40.71#-74.01');
  });

  test('0 cells → no SQS calls, logs fanout_complete with cells: 0', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    await testHandler({}, mockContext);

    expect(sqsMock.commandCalls(SendMessageBatchCommand)).toHaveLength(0);
    expect(mockLogger.info).toHaveBeenCalledWith('fanout_complete', { cells: 0 });
  });

  test('paginated scan (two pages of results) → messages from both pages sent', async () => {
    // First scan returns 10 items and a LastEvaluatedKey
    // Second scan returns 5 items and no LastEvaluatedKey
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: makeCellItems(10),
        LastEvaluatedKey: { pk: 'LL#49.00#-74.01' },
      })
      .resolvesOnce({
        Items: makeCellItems(5).map((item, i) => ({
          pk: `LL#${(50 + i).toFixed(2)}#-74.01`,
        })),
        LastEvaluatedKey: undefined,
      });

    await testHandler({}, mockContext);

    // 15 total cells → 2 batches (10 + 5)
    const sqsCalls = sqsMock.commandCalls(SendMessageBatchCommand);
    expect(sqsCalls).toHaveLength(2);
    expect(sqsCalls[0].args[0].input.Entries).toHaveLength(10);
    expect(sqsCalls[1].args[0].input.Entries).toHaveLength(5);
  });
});
