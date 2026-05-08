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
import type { Alert } from '../../lib/schema.js';

// ── constants ─────────────────────────────────────────────────────────────────

const ALERTS_TABLE = 'test-alerts-table';
// Small STATES slice — tests don't need all 50; mock nws.js provides this.
const TEST_STATES = ['TX', 'OK', 'AR'] as const;

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
  config: { ALERTS_TABLE, NWS_USER_AGENT: 'test-agent/1.0' },
}));

const mockLogger = {
  info: jest.fn<(...args: unknown[]) => void>(),
  warn: jest.fn<(...args: unknown[]) => void>(),
  error: jest.fn<(...args: unknown[]) => void>(),
};
const mockAddMetric = jest.fn<(name: string, unit: unknown, value: number) => void>();
jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: { addMetric: mockAddMetric },
}));

const mockFetchActiveAlertsForState = jest.fn<(state: string) => Promise<Alert[]>>();
jest.unstable_mockModule('../../providers/nws.js', () => ({
  STATES: TEST_STATES,
  fetchActiveAlertsForState: mockFetchActiveAlertsForState,
}));

const mockBatchPutAlerts = jest.fn<(state: string, alerts: Alert[]) => Promise<void>>();
jest.unstable_mockModule('../../repos/alertsRepo.js', () => ({
  AlertsRepo: jest.fn().mockImplementation(() => ({
    batchPutAlerts: mockBatchPutAlerts,
  })),
}));

// ── module import (after all mocks registered) ───────────────────────────────

// withObservability returns MiddyfiedHandler<unknown, void> which structurally matches
// (event: unknown, context: Context) => Promise<void>. Direct assignment — no assertion.
type TestHandler = (event: unknown, context: Context) => Promise<void>;
let testHandler: TestHandler;

beforeAll(async () => {
  const mod = await import('../../handlers/nwsPoller.js');
  testHandler = mod.handler;
});

// ── helpers ───────────────────────────────────────────────────────────────────

const mockContext = {} as Context;

function makeAlert(state: string): Alert {
  return {
    alert_id: `urn:oid:test-alert-${state}`,
    state,
    event: 'Tornado Warning',
    severity: 'Extreme',
    headline: `Tornado Warning for ${state}`,
    description: 'Test description.',
    affected_zones: ['TXZ192'],
    is_state_wide: false,
    effective: '2026-01-01T18:00:00Z',
    expires: '2026-01-02T00:00:00Z',
    source: 'nws',
  };
}

beforeEach(() => {
  mockFetchActiveAlertsForState.mockReset();
  mockBatchPutAlerts.mockReset();
  mockAddMetric.mockReset();
  mockLogger.info.mockReset();
  mockLogger.warn.mockReset();
  mockBatchPutAlerts.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('nwsPoller handler', () => {
  test('one state fails (network error), others succeed — no cascade', async () => {
    mockFetchActiveAlertsForState
      .mockResolvedValueOnce([makeAlert('TX')]) // TX succeeds
      .mockRejectedValueOnce(new Error('network timeout')) // OK fails
      .mockResolvedValueOnce([makeAlert('AR')]); // AR succeeds

    await testHandler({}, mockContext);

    // TX and AR wrote alerts; OK failure did not cascade
    expect(mockBatchPutAlerts).toHaveBeenCalledTimes(2);
    expect(mockBatchPutAlerts).toHaveBeenCalledWith('TX', expect.any(Array));
    expect(mockBatchPutAlerts).toHaveBeenCalledWith('AR', expect.any(Array));

    // Counts: 2 ok, 1 failed
    expect(mockAddMetric).toHaveBeenCalledWith('NwsStatesOk', expect.anything(), 2);
    expect(mockAddMetric).toHaveBeenCalledWith('NwsStatesFailed', expect.anything(), 1);

    // Warn logged for the failed state
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'nws_state_failed',
      expect.objectContaining({ state: 'OK' }),
    );
  });

  test('state with empty alerts → no DDB write for that state', async () => {
    mockFetchActiveAlertsForState
      .mockResolvedValueOnce([makeAlert('TX')]) // TX: 1 alert
      .mockResolvedValueOnce([]) // OK: no active alerts
      .mockResolvedValueOnce([makeAlert('AR')]); // AR: 1 alert

    await testHandler({}, mockContext);

    // Only TX and AR triggered batchPutAlerts (OK had 0 alerts)
    expect(mockBatchPutAlerts).toHaveBeenCalledTimes(2);
    expect(mockBatchPutAlerts).not.toHaveBeenCalledWith('OK', expect.any(Array));

    // All 3 states are counted as OK (fetch succeeded; 0 alerts is not a failure)
    expect(mockAddMetric).toHaveBeenCalledWith('NwsStatesOk', expect.anything(), 3);
    expect(mockAddMetric).toHaveBeenCalledWith('NwsStatesFailed', expect.anything(), 0);
  });

  test('metrics emitted with correct counts when all states succeed', async () => {
    mockFetchActiveAlertsForState.mockResolvedValue([makeAlert('TX')]);

    await testHandler({}, mockContext);

    expect(mockAddMetric).toHaveBeenCalledWith(
      'NwsStatesOk',
      expect.anything(),
      TEST_STATES.length,
    );
    expect(mockAddMetric).toHaveBeenCalledWith('NwsStatesFailed', expect.anything(), 0);
    expect(mockLogger.info).toHaveBeenCalledWith('nws_poll_complete', {
      okStates: TEST_STATES.length,
      failedStates: 0,
    });
  });

  test('wrapped handler (withObservability) runs end-to-end without error', async () => {
    mockFetchActiveAlertsForState.mockResolvedValue([]);

    // Invoking the wrapped export exercises the full middleware chain (injectLambdaContext,
    // captureLambdaHandler, logMetrics). These are mocked as no-ops but the chain still runs.
    await expect(testHandler({}, mockContext)).resolves.toBeUndefined();
  });
});
