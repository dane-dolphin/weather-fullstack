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
  GetCommand,
  QueryCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { GeocodeEntry, WeatherSnapshot } from '../../lib/schema.js';
import type { ResolvedPoint } from '../../lib/nwsPoints.js';

// ── constants ────────────────────────────────────────────────────────────────

const GEOCODE_TABLE = 'geocode-table';
const WEATHER_TABLE = 'weather-table';
const ALERTS_TABLE = 'alerts-table';
const WEATHER_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/weather.fifo';

// ── mock data ─────────────────────────────────────────────────────────────────

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
const MOCK_GEO_DDB = { pk: 'LL#40.71#-74.01', ...MOCK_GEO };

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

const NOW_SEC = Math.floor(Date.now() / 1000);

const FRESH_WEATHER_DDB = {
  pk: 'LL#40.71#-74.01',
  payload: MOCK_SNAPSHOT,
  fetched_at: NOW_SEC - 100, // 100 s ago — well under the 7200 s fresh threshold
  ttl: NOW_SEC + 21500,
};

const STALE_WEATHER_DDB = {
  pk: 'LL#40.71#-74.01',
  payload: MOCK_SNAPSHOT,
  fetched_at: NOW_SEC - 10000, // 10000 s ago — over the 7200 s fresh threshold
  ttl: NOW_SEC + 11600,
};

// ── mocks ────────────────────────────────────────────────────────────────────

// Powertools middleware replaced with passthrough no-ops.  Tests exercise the
// real locationResolver + errorHandler chain through withHttp, giving
// src/middleware/index.ts its first coverage.
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
    WEATHER_TABLE,
    ALERTS_TABLE,
    WEATHER_QUEUE_URL,
    WEATHER_FRESH_SECONDS: 7200,
    GEOCODE_REFRESH_SECONDS: 2592000,
  },
}));

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('../../lib/observability.js', () => ({
  logger: mockLogger,
  tracer: {},
  metrics: {},
}));

const mockResolvePoint = jest.fn<(lat: number, lon: number) => Promise<ResolvedPoint>>();
jest.unstable_mockModule('../../lib/nwsPoints.js', () => ({
  resolvePoint: mockResolvePoint,
}));

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

// ── module import (after all mocks are registered) ────────────────────────────

// The handler is typed to accept ResolvedEvent (enriched by locationResolver),
// but tests pass APIGatewayProxyEvent — the middleware enriches it at runtime.
type TestHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;
let testHandler: TestHandler;

beforeAll(async () => {
  const mod = await import('../../handlers/readWeather.js');
  testHandler = mod.handler as unknown as TestHandler;
});

// ── helpers ───────────────────────────────────────────────────────────────────

const mockContext = {} as Context;

function makeEvent(qs: Record<string, string> | null): APIGatewayProxyEvent {
  return { queryStringParameters: qs } as unknown as APIGatewayProxyEvent;
}

function body(res: APIGatewayProxyResult): Record<string, unknown> {
  return JSON.parse(res.body) as Record<string, unknown>;
}

type SetupOptions = {
  geocodeItem?: Record<string, unknown> | null;
  weatherItem?: Record<string, unknown> | null;
  alertItems?: Record<string, unknown>[];
  quakeItems?: Record<string, unknown>[];
};

function setupDDB({
  geocodeItem = MOCK_GEO_DDB,
  weatherItem = FRESH_WEATHER_DDB,
  alertItems = [],
  quakeItems = [],
}: SetupOptions = {}): void {
  ddbMock
    .on(GetCommand, { TableName: GEOCODE_TABLE })
    .resolves(geocodeItem ? { Item: geocodeItem } : {});
  ddbMock
    .on(GetCommand, { TableName: WEATHER_TABLE })
    .resolves(weatherItem ? { Item: weatherItem } : {});
  ddbMock.on(PutCommand).resolves({});
  ddbMock
    .on(QueryCommand, {
      TableName: ALERTS_TABLE,
      ExpressionAttributeValues: { ':pk': 'STATE#NY' },
    })
    .resolves({ Items: alertItems });
  ddbMock
    .on(QueryCommand, {
      TableName: ALERTS_TABLE,
      ExpressionAttributeValues: { ':pk': 'QUAKE#GLOBAL' },
    })
    .resolves({ Items: quakeItems });
}

beforeEach(() => {
  ddbMock.reset();
  sqsMock.reset();
  sqsMock.on(SendMessageCommand).resolves({});
  mockResolvePoint.mockResolvedValue(MOCK_RESOLVED_POINT);
  setupDDB();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('request validation — hits locationResolver + errorHandler chain', () => {
  test('missing lat → 400', async () => {
    const res = await testHandler(makeEvent({ lon: '-74.01' }), mockContext);
    expect(res.statusCode).toBe(400);
    expect(body(res)).toMatchObject({ code: 'invalid_query' });
  });

  test('missing lon → 400', async () => {
    const res = await testHandler(makeEvent({ lat: '40.71' }), mockContext);
    expect(res.statusCode).toBe(400);
  });

  test('out-of-range lat=200 → 400', async () => {
    const res = await testHandler(makeEvent({ lat: '200', lon: '-74.01' }), mockContext);
    expect(res.statusCode).toBe(400);
  });

  test('null queryStringParameters → 400', async () => {
    const res = await testHandler(makeEvent(null), mockContext);
    expect(res.statusCode).toBe(400);
  });
});

describe('geocode cache', () => {
  test('cache miss: resolvePoint called and geocode entry stored', async () => {
    setupDDB({ geocodeItem: null }); // override: no geocode item = cache miss
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(200);
    expect(mockResolvePoint).toHaveBeenCalledWith(40.71, -74.01);
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBeGreaterThan(0);
    expect(putCalls[0].args[0].input).toMatchObject({ TableName: GEOCODE_TABLE });
  });

  test('stale geocode (>30 days): fire-and-forget refresh, response not blocked', async () => {
    const staleGeo = { ...MOCK_GEO_DDB, resolved_at: NOW_SEC - 2_592_001 };
    setupDDB({ geocodeItem: staleGeo });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(200);
    expect(mockResolvePoint).toHaveBeenCalled(); // fire-and-forget was kicked off
  });
});

describe('weather cache', () => {
  test('cold-start: no weather row → weather: null AND SQS SendMessage fired', async () => {
    setupDDB({ weatherItem: null });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(200);
    expect(body(res).weather).toBeNull();

    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls).toHaveLength(1);
    expect(sqsCalls[0].args[0].input).toMatchObject({
      QueueUrl: WEATHER_QUEUE_URL,
      MessageBody: 'LL#40.71#-74.01',
      MessageGroupId: 'LL#40.71#-74.01',
      MessageDeduplicationId: 'LL#40.71#-74.01',
    });
  });

  test('fresh weather (fetched_at < 2h): is_stale = false, no SQS enqueue', async () => {
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(200);
    const weather = body(res).weather as Record<string, unknown>;
    expect(weather).not.toBeNull();
    expect(weather.is_stale).toBe(false);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  test('stale-but-present weather (fetched_at > 2h): is_stale = true, weather returned, no SQS enqueue', async () => {
    setupDDB({ weatherItem: STALE_WEATHER_DDB });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(200);
    const weather = body(res).weather as Record<string, unknown>;
    expect(weather).not.toBeNull();
    expect(weather.is_stale).toBe(true);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0); // row exists, no enqueue
  });
});

describe('alert filtering', () => {
  const BASE_STORED_ALERT = {
    pk: 'STATE#NY',
    sk: 'ALERT#alert-1',
    ttl: NOW_SEC + 3600,
    alert_id: 'alert-1',
    state: 'NY',
    event: 'Tornado Warning',
    severity: 'Extreme',
    headline: 'Dangerous tornado',
    description: 'Seek shelter.',
    effective: '2026-05-05T10:00:00.000Z',
    expires: '2026-05-05T12:00:00.000Z',
    source: 'nws',
    is_state_wide: false,
    affected_zones: [] as string[],
  };

  test('alert matching county_zone (NYC001) → returned', async () => {
    const alert = { ...BASE_STORED_ALERT, affected_zones: ['NYC001'] };
    setupDDB({ alertItems: [alert] });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect((body(res).alerts as unknown[]).length).toBe(1);
  });

  test('alert matching forecast_zone (NYZ072) → returned', async () => {
    const alert = { ...BASE_STORED_ALERT, affected_zones: ['NYZ072'] };
    setupDDB({ alertItems: [alert] });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect((body(res).alerts as unknown[]).length).toBe(1);
  });

  test('alert with no zone match, is_state_wide: false → filtered out', async () => {
    const alert = { ...BASE_STORED_ALERT, affected_zones: ['TXZ999'], is_state_wide: false };
    setupDDB({ alertItems: [alert] });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect((body(res).alerts as unknown[]).length).toBe(0);
  });

  test('state-wide alert (is_state_wide: true) → returned regardless of zone match', async () => {
    const alert = { ...BASE_STORED_ALERT, affected_zones: ['TXZ999'], is_state_wide: true };
    setupDDB({ alertItems: [alert] });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect((body(res).alerts as unknown[]).length).toBe(1);
  });

  test('empty affected_zones, is_state_wide: false → filtered out (fail-closed)', async () => {
    const alert = { ...BASE_STORED_ALERT, affected_zones: [], is_state_wide: false };
    setupDDB({ alertItems: [alert] });
    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect((body(res).alerts as unknown[]).length).toBe(0);
  });
});

describe('earthquake filtering', () => {
  const NOW_MS = Date.now();

  test('earthquake within 300 km returned; earthquake outside 300 km filtered', async () => {
    // Request point: NYC 40.71, -74.01
    // Near: NJ area ~89 km away (well within 300 km)
    const nearQuake = {
      pk: 'QUAKE#GLOBAL',
      sk: 'QUAKE#near',
      ttl: NOW_SEC + 21600,
      quake_id: 'near',
      magnitude: 5.0,
      place: 'New Jersey',
      time: NOW_MS,
      lat: 40.0,
      lon: -74.5,
    };
    // Far: LAX area ~3940 km away
    const farQuake = {
      pk: 'QUAKE#GLOBAL',
      sk: 'QUAKE#far',
      ttl: NOW_SEC + 21600,
      quake_id: 'far',
      magnitude: 7.0,
      place: 'Los Angeles',
      time: NOW_MS,
      lat: 33.94,
      lon: -118.41,
    };
    setupDDB({ quakeItems: [nearQuake, farQuake] });

    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    const quakes = body(res).earthquakes as Array<Record<string, unknown>>;
    expect(quakes).toHaveLength(1);
    expect(quakes[0].quake_id).toBe('near');
  });
});

describe('DDB error → 500', () => {
  test('weatherRepo.get throws → 500 with generic body, no internal details leaked', async () => {
    // Geocode must succeed so the error occurs inside baseHandler (not locationResolver)
    ddbMock.on(GetCommand, { TableName: GEOCODE_TABLE }).resolves({ Item: MOCK_GEO_DDB });
    ddbMock.on(GetCommand, { TableName: WEATHER_TABLE }).rejects(new Error('DDB internal error'));

    const res = await testHandler(makeEvent({ lat: '40.71', lon: '-74.01' }), mockContext);

    expect(res.statusCode).toBe(500);
    const b = body(res);
    expect(b.code).toBe('internal_error');
    expect(b.message).toBe('Internal server error');
    expect(JSON.stringify(b)).not.toContain('DDB internal error');
  });
});
