import { describe, test, expect, jest, beforeAll, afterEach } from '@jest/globals';
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { GeocodeEntry, GeocodeRepo } from '../../lib/schema.js';
import { ValidationError } from '../../lib/errors.js';
import type { ResolvedPoint } from '../../lib/nwsPoints.js';

const MOCK_GEO: GeocodeEntry = {
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
  resolved_at: Math.floor(Date.now() / 1000),
};

const MOCK_RESOLVED_POINT: ResolvedPoint = {
  state: 'NY',
  county_zone: 'NYC001',
  forecast_zone: 'NYZ072',
  fire_weather_zone: 'NYZ072',
  cwa: 'OKX',
  grid_id: 'OKX',
  grid_x: 32,
  grid_y: 34,
  time_zone: 'America/New_York',
};

const MOCK_CONFIG = {
  GEOCODE_REFRESH_SECONDS: 2592000,
  NWS_USER_AGENT: 'test-agent',
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockResolvePoint = jest.fn<(lat: number, lon: number) => Promise<ResolvedPoint>>();

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: MOCK_CONFIG,
}));

jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: {},
}));

jest.unstable_mockModule('../../lib/nwsPoints.js', () => ({
  resolvePoint: mockResolvePoint,
}));

let locationResolverFn: typeof import('../../middleware/locationResolver.js')['locationResolver'];

beforeAll(async () => {
  ({ locationResolver: locationResolverFn } = await import(
    '../../middleware/locationResolver.js'
  ));
});

afterEach(() => {
  jest.clearAllMocks();
});

const mockContext = {} as Context;

function makeEvent(qs: Record<string, string> | null): APIGatewayProxyEvent {
  return {
    queryStringParameters: qs,
  } as unknown as APIGatewayProxyEvent;
}

type Captured = { lat: number; lon: number; geo: GeocodeEntry } | undefined;

type HandlerResult = { statusCode: number; body: string };

function buildHandler(repo: GeocodeRepo) {
  let captured: Captured;
  const handler = middy<APIGatewayProxyEvent, HandlerResult>(async (event: APIGatewayProxyEvent) => {
    captured = (event as unknown as { resolved: Captured }).resolved;
    return { statusCode: 200, body: '' };
  }).use(locationResolverFn(repo));
  return {
    handler,
    getCapture: () => captured,
  };
}

function mockRepo(overrides: Partial<GeocodeRepo> = {}): GeocodeRepo {
  return {
    get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(null),
    put: jest.fn<GeocodeRepo['put']>().mockResolvedValue(MOCK_GEO),
    updateCity: jest.fn<GeocodeRepo['updateCity']>().mockResolvedValue(undefined),
    listAllCellKeys: jest.fn<GeocodeRepo['listAllCellKeys']>().mockResolvedValue([]),
    ...overrides,
  };
}

describe('query param validation', () => {
  test('missing lat → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(handler(makeEvent({ lon: '-74.01' }), mockContext)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test('missing lon → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(handler(makeEvent({ lat: '40.71' }), mockContext)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test('non-numeric lat → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(
      handler(makeEvent({ lat: 'abc', lon: '-74.01' }), mockContext),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('out-of-range lat=200 → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(
      handler(makeEvent({ lat: '200', lon: '-74.01' }), mockContext),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('out-of-range lon=200 → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(
      handler(makeEvent({ lat: '40.71', lon: '200' }), mockContext),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('missing queryStringParameters → ValidationError', async () => {
    const { handler } = buildHandler(mockRepo());
    await expect(handler(makeEvent(null), mockContext)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('cache miss', () => {
  test('calls resolvePoint and stores result', async () => {
    mockResolvePoint.mockResolvedValue(MOCK_RESOLVED_POINT);
    const repo = mockRepo({ get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(null) });
    const { handler, getCapture } = buildHandler(repo);

    await handler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(mockResolvePoint).toHaveBeenCalledWith(40.71, -74.01);
    expect(repo.put).toHaveBeenCalledWith(
      expect.objectContaining({ lat_2dp: 40.71, lon_2dp: -74.01 }),
    );
    expect(getCapture()?.geo).toBeDefined();
  });

  test('event.resolved contains original lat/lon (not rounded)', async () => {
    mockResolvePoint.mockResolvedValue(MOCK_RESOLVED_POINT);
    const repo = mockRepo({ get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(null) });
    const { handler, getCapture } = buildHandler(repo);

    await handler(makeEvent({ lat: '40.7128', lon: '-74.0061' }), mockContext);

    const captured = getCapture();
    expect(captured?.lat).toBe(40.7128);
    expect(captured?.lon).toBe(-74.0061);
  });
});

describe('cache hit — fresh', () => {
  test('does not call resolvePoint', async () => {
    const freshGeo = { ...MOCK_GEO, resolved_at: Math.floor(Date.now() / 1000) };
    const repo = mockRepo({
      get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(freshGeo),
    });
    const { handler } = buildHandler(repo);

    await handler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(mockResolvePoint).not.toHaveBeenCalled();
    expect(repo.put).not.toHaveBeenCalled();
  });

  test('returns cached geo in resolved', async () => {
    const freshGeo = { ...MOCK_GEO, resolved_at: Math.floor(Date.now() / 1000) };
    const repo = mockRepo({
      get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(freshGeo),
    });
    const { handler, getCapture } = buildHandler(repo);

    await handler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(getCapture()?.geo).toEqual(freshGeo);
  });
});

describe('cache hit — stale (>30 days)', () => {
  test('fires refresh without blocking and serves existing data', async () => {
    const STALE_TS = Math.floor(Date.now() / 1000) - MOCK_CONFIG.GEOCODE_REFRESH_SECONDS - 1;
    const staleGeo = { ...MOCK_GEO, resolved_at: STALE_TS };
    mockResolvePoint.mockResolvedValue(MOCK_RESOLVED_POINT);
    const repo = mockRepo({
      get: jest.fn<GeocodeRepo['get']>().mockResolvedValue(staleGeo),
      put: jest.fn<GeocodeRepo['put']>().mockResolvedValue(MOCK_GEO),
    });
    const { handler, getCapture } = buildHandler(repo);

    await handler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    // Handler returned the stale data immediately (fire-and-forget, not blocking)
    expect(getCapture()?.geo).toEqual(staleGeo);
    // The fire-and-forget was triggered (resolvePoint was called synchronously before yielding)
    expect(mockResolvePoint).toHaveBeenCalled();
  });
});
