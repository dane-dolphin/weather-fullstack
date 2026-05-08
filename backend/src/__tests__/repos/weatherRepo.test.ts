import { describe, test, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const WEATHER_TTL_SECONDS = 21600;

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: { WEATHER_TTL_SECONDS },
}));

const ddbMock = mockClient(DynamoDBDocumentClient);

let WeatherRepo: (typeof import('../../repos/weatherRepo.js'))['WeatherRepo'];

beforeAll(async () => {
  ({ WeatherRepo } = await import('../../repos/weatherRepo.js'));
});

beforeEach(() => {
  ddbMock.reset();
});

const TABLE = 'weather-table';

const SNAPSHOT = {
  high: 28,
  low: 18,
  currentTemp: 22,
  apparentTemp: 24,
  precipitation: 0,
  windSpeed: 10,
  windDirection: 180,
  humidity: 65,
  source: 'open-meteo' as const,
  fetchedAt: '2025-01-01T12:00:00.000Z',
};

describe('WeatherRepo.get', () => {
  test('returns WeatherRecord with payload and fetched_at when found', async () => {
    const fetched_at = 1_700_000_000;
    ddbMock.on(GetCommand).resolves({
      Item: { pk: 'LL#40.71#-74.01', payload: SNAPSHOT, fetched_at, ttl: fetched_at + WEATHER_TTL_SECONDS },
    });
    const repo = new WeatherRepo(TABLE);
    const result = await repo.get(40.71, -74.01);
    expect(result).toEqual({ payload: SNAPSHOT, fetched_at });
  });

  test('uses correct TableName and Key pk', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { pk: 'LL#40.71#-74.01', payload: SNAPSHOT, fetched_at: 1_700_000_000, ttl: 0 },
    });
    const repo = new WeatherRepo(TABLE);
    await repo.get(40.71, -74.01);
    const calls = ddbMock.commandCalls(GetCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: 'LL#40.71#-74.01' },
    });
  });

  test('returns null when item not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const repo = new WeatherRepo(TABLE);
    const result = await repo.get(40.71, -74.01);
    expect(result).toBeNull();
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DDB error'));
    const repo = new WeatherRepo(TABLE);
    await expect(repo.get(40.71, -74.01)).rejects.toThrow('DDB error');
  });
});

describe('WeatherRepo.put', () => {
  test('stores snapshot with correct pk and ConditionExpression', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new WeatherRepo(TABLE);
    await repo.put(40.71, -74.01, SNAPSHOT);
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      ConditionExpression: 'attribute_not_exists(fetched_at) OR fetched_at < :incoming',
      Item: expect.objectContaining({ pk: 'LL#40.71#-74.01', payload: SNAPSHOT }),
    });
  });

  test('sets fetched_at to current epoch seconds', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new WeatherRepo(TABLE);
    const before = Math.floor(Date.now() / 1000);
    await repo.put(40.71, -74.01, SNAPSHOT);
    const after = Math.floor(Date.now() / 1000);
    const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item!;
    const fetched_at = item['fetched_at'] as number;
    expect(fetched_at).toBeGreaterThanOrEqual(before);
    expect(fetched_at).toBeLessThanOrEqual(after);
  });

  test('sets ttl to fetched_at + WEATHER_TTL_SECONDS', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new WeatherRepo(TABLE);
    await repo.put(40.71, -74.01, SNAPSHOT);
    const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item!;
    const fetched_at = item['fetched_at'] as number;
    expect(item['ttl']).toBe(fetched_at + WEATHER_TTL_SECONDS);
  });

  test('passes fetched_at as :incoming ExpressionAttributeValue', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new WeatherRepo(TABLE);
    await repo.put(40.71, -74.01, SNAPSHOT);
    const input = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    const fetched_at = input.Item!['fetched_at'] as number;
    expect(input.ExpressionAttributeValues![':incoming']).toBe(fetched_at);
  });

  test('swallows ConditionalCheckFailedException (idempotency)', async () => {
    ddbMock.on(PutCommand).rejects(
      new ConditionalCheckFailedException({ message: 'Condition failed', $metadata: {} }),
    );
    const repo = new WeatherRepo(TABLE);
    await expect(repo.put(40.71, -74.01, SNAPSHOT)).resolves.toBeUndefined();
  });

  test('bubbles non-conditional DDB errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('Throughput exceeded'));
    const repo = new WeatherRepo(TABLE);
    await expect(repo.put(40.71, -74.01, SNAPSHOT)).rejects.toThrow('Throughput exceeded');
  });
});
