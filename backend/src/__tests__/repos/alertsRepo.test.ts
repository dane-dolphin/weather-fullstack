import { describe, test, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Alert, Earthquake } from '../../lib/schema.js';

const EARTHQUAKE_TTL_SECONDS = 21600;

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: { EARTHQUAKE_TTL_SECONDS },
}));

const ddbMock = mockClient(DynamoDBDocumentClient);

let AlertsRepo: (typeof import('../../repos/alertsRepo.js'))['AlertsRepo'];

beforeAll(async () => {
  ({ AlertsRepo } = await import('../../repos/alertsRepo.js'));
});

beforeEach(() => {
  ddbMock.reset();
});

const TABLE = 'alerts-table';

const ALERT: Alert = {
  alert_id: 'alert-123',
  state: 'TX',
  event: 'Tornado Warning',
  severity: 'Extreme',
  headline: 'Dangerous tornado approaching',
  description: 'Take shelter immediately.',
  affected_zones: ['TXZ192', 'TXC453'],
  is_state_wide: false,
  effective: '2025-01-01T10:00:00.000Z',
  expires: '2025-01-01T12:00:00.000Z',
  source: 'nws',
};

const STORED_ALERT = {
  ...ALERT,
  pk: 'STATE#TX',
  sk: 'ALERT#alert-123',
  ttl: Math.floor(new Date(ALERT.expires).getTime() / 1000),
};

const EARTHQUAKE: Earthquake = {
  quake_id: 'us7000abc1',
  magnitude: 6.2,
  place: '5km NE of Somewhere',
  time: 1_700_000_000_000,
  lat: 37.5,
  lon: -122.0,
};

const STORED_EARTHQUAKE = {
  ...EARTHQUAKE,
  pk: 'QUAKE#GLOBAL',
  sk: 'QUAKE#us7000abc1',
  ttl: Math.floor(EARTHQUAKE.time / 1000) + EARTHQUAKE_TTL_SECONDS,
};

describe('AlertsRepo.getByState', () => {
  test('returns Alert[] for a state', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [STORED_ALERT] });
    const repo = new AlertsRepo(TABLE);
    const result = await repo.getByState('TX');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ alert_id: 'alert-123', event: 'Tornado Warning' });
  });

  test('strips pk, sk, ttl from returned alerts', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [STORED_ALERT] });
    const repo = new AlertsRepo(TABLE);
    const [alert] = await repo.getByState('TX');
    expect(alert).not.toHaveProperty('pk');
    expect(alert).not.toHaveProperty('sk');
    expect(alert).not.toHaveProperty('ttl');
  });

  test('uses correct pk for query', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const repo = new AlertsRepo(TABLE);
    await repo.getByState('CA');
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      ExpressionAttributeValues: { ':pk': 'STATE#CA' },
    });
  });

  test('returns empty array when no alerts', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const repo = new AlertsRepo(TABLE);
    expect(await repo.getByState('TX')).toEqual([]);
  });

  test('returns empty array when Items is undefined', async () => {
    ddbMock.on(QueryCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    expect(await repo.getByState('TX')).toEqual([]);
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DDB error'));
    const repo = new AlertsRepo(TABLE);
    await expect(repo.getByState('TX')).rejects.toThrow('DDB error');
  });
});

describe('AlertsRepo.getEarthquakes', () => {
  test('returns Earthquake[] from QUAKE#GLOBAL', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [STORED_EARTHQUAKE] });
    const repo = new AlertsRepo(TABLE);
    const result = await repo.getEarthquakes();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quake_id: 'us7000abc1', magnitude: 6.2 });
  });

  test('strips pk, sk, ttl from returned earthquakes', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [STORED_EARTHQUAKE] });
    const repo = new AlertsRepo(TABLE);
    const [eq] = await repo.getEarthquakes();
    expect(eq).not.toHaveProperty('pk');
    expect(eq).not.toHaveProperty('sk');
    expect(eq).not.toHaveProperty('ttl');
  });

  test('queries QUAKE#GLOBAL pk', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const repo = new AlertsRepo(TABLE);
    await repo.getEarthquakes();
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0].args[0].input.ExpressionAttributeValues).toEqual({ ':pk': 'QUAKE#GLOBAL' });
  });

  test('returns empty array when Items is empty', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const repo = new AlertsRepo(TABLE);
    expect(await repo.getEarthquakes()).toEqual([]);
  });

  test('returns empty array when Items is undefined', async () => {
    ddbMock.on(QueryCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    expect(await repo.getEarthquakes()).toEqual([]);
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('Query error'));
    const repo = new AlertsRepo(TABLE);
    await expect(repo.getEarthquakes()).rejects.toThrow('Query error');
  });
});

describe('AlertsRepo.putAlert', () => {
  test('stores alert with correct pk, sk, and ttl', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    await repo.putAlert('TX', ALERT);
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: 'STATE#TX',
        sk: 'ALERT#alert-123',
        ttl: Math.floor(new Date(ALERT.expires).getTime() / 1000),
        alert_id: 'alert-123',
      }),
    });
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('Write error'));
    const repo = new AlertsRepo(TABLE);
    await expect(repo.putAlert('TX', ALERT)).rejects.toThrow('Write error');
  });
});

describe('AlertsRepo.putEarthquake', () => {
  test('stores earthquake with correct pk, sk, and ttl', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    await repo.putEarthquake(EARTHQUAKE);
    const calls = ddbMock.commandCalls(PutCommand);
    const expectedTtl = Math.floor(EARTHQUAKE.time / 1000) + EARTHQUAKE_TTL_SECONDS;
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: 'QUAKE#GLOBAL',
        sk: 'QUAKE#us7000abc1',
        ttl: expectedTtl,
        quake_id: 'us7000abc1',
        magnitude: 6.2,
      }),
    });
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('Write failed'));
    const repo = new AlertsRepo(TABLE);
    await expect(repo.putEarthquake(EARTHQUAKE)).rejects.toThrow('Write failed');
  });
});

describe('AlertsRepo.batchPutAlerts', () => {
  test('writes single chunk for ≤25 alerts with correct shape', async () => {
    ddbMock.on(BatchWriteCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    await repo.batchPutAlerts('TX', [ALERT]);
    const calls = ddbMock.commandCalls(BatchWriteCommand);
    expect(calls).toHaveLength(1);
    const items = calls[0].args[0].input.RequestItems![TABLE];
    expect(items).toHaveLength(1);
    expect(items[0].PutRequest!.Item).toMatchObject({
      pk: 'STATE#TX',
      sk: 'ALERT#alert-123',
      ttl: Math.floor(new Date(ALERT.expires).getTime() / 1000),
    });
  });

  test('chunks 26 alerts into two BatchWriteCommand calls (25 + 1)', async () => {
    ddbMock.on(BatchWriteCommand).resolves({});
    const repo = new AlertsRepo(TABLE);
    const alerts = Array.from({ length: 26 }, (_, i) => ({ ...ALERT, alert_id: `alert-${i}` }));
    await repo.batchPutAlerts('TX', alerts);
    const calls = ddbMock.commandCalls(BatchWriteCommand);
    expect(calls).toHaveLength(2);
    expect(calls[0].args[0].input.RequestItems![TABLE]).toHaveLength(25);
    expect(calls[1].args[0].input.RequestItems![TABLE]).toHaveLength(1);
  });

  test('does nothing for empty alerts array', async () => {
    const repo = new AlertsRepo(TABLE);
    await repo.batchPutAlerts('TX', []);
    expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0);
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(BatchWriteCommand).rejects(new Error('Batch write failed'));
    const repo = new AlertsRepo(TABLE);
    await expect(repo.batchPutAlerts('TX', [ALERT])).rejects.toThrow('Batch write failed');
  });
});
