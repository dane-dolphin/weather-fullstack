import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoGeocodeRepo } from '../../repos/geocodeRepo.js';

const TABLE = 'geocode-table';
const ddbMock = mockClient(DynamoDBDocumentClient);

const ENTRY = {
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
  radar_station: 'KOKX',
  time_zone: 'America/New_York',
  resolved_at: 1_700_000_000,
};

beforeEach(() => {
  ddbMock.reset();
});

describe('DynamoGeocodeRepo.get', () => {
  test('returns GeocodeEntry when found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...ENTRY, pk: 'LL#40.71#-74.01' } });
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.get(40.71, -74.01);
    expect(result).toEqual(ENTRY);
  });

  test('uses correct TableName and Key pk', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...ENTRY, pk: 'LL#40.71#-74.01' } });
    const repo = new DynamoGeocodeRepo(TABLE);
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
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.get(40.71, -74.01);
    expect(result).toBeNull();
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DDB error'));
    const repo = new DynamoGeocodeRepo(TABLE);
    await expect(repo.get(40.71, -74.01)).rejects.toThrow('DDB error');
  });

  test('strips pk from returned entry', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...ENTRY, pk: 'LL#40.71#-74.01' } });
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.get(40.71, -74.01);
    expect(result).not.toHaveProperty('pk');
  });
});

describe('DynamoGeocodeRepo.put', () => {
  test('stores entry with pk and returns the entry', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.put(ENTRY);
    expect(result).toEqual(ENTRY);
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      Item: { ...ENTRY, pk: 'LL#40.71#-74.01' },
    });
  });

  test('derives pk from lat_2dp and lon_2dp', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new DynamoGeocodeRepo(TABLE);
    await repo.put({ ...ENTRY, lat_2dp: 34.05, lon_2dp: -118.24 });
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0].args[0].input.Item!['pk']).toBe('LL#34.05#-118.24');
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(PutCommand).rejects(new Error('Write failed'));
    const repo = new DynamoGeocodeRepo(TABLE);
    await expect(repo.put(ENTRY)).rejects.toThrow('Write failed');
  });
});

describe('DynamoGeocodeRepo.listAllCellKeys', () => {
  test('returns cells from single-page scan', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [{ pk: 'LL#40.71#-74.01' }, { pk: 'LL#34.05#-118.24' }],
    });
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.listAllCellKeys();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ lat_2dp: 40.71, lon_2dp: -74.01 });
    expect(result[1]).toEqual({ lat_2dp: 34.05, lon_2dp: -118.24 });
  });

  test('uses ProjectionExpression pk and correct TableName', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    const repo = new DynamoGeocodeRepo(TABLE);
    await repo.listAllCellKeys();
    const calls = ddbMock.commandCalls(ScanCommand);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: TABLE,
      ProjectionExpression: 'pk',
    });
  });

  test('paginates through multiple pages and returns all cells', async () => {
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: [{ pk: 'LL#40.71#-74.01' }],
        LastEvaluatedKey: { pk: 'LL#40.71#-74.01' },
      })
      .resolves({
        Items: [{ pk: 'LL#34.05#-118.24' }],
        LastEvaluatedKey: undefined,
      });
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.listAllCellKeys();
    expect(result).toHaveLength(2);
    expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(2);
    expect(ddbMock.commandCalls(ScanCommand)[1].args[0].input.ExclusiveStartKey).toEqual({
      pk: 'LL#40.71#-74.01',
    });
  });

  test('returns empty array when table is empty', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.listAllCellKeys();
    expect(result).toEqual([]);
  });

  test('handles undefined Items in scan response', async () => {
    ddbMock.on(ScanCommand).resolves({});
    const repo = new DynamoGeocodeRepo(TABLE);
    const result = await repo.listAllCellKeys();
    expect(result).toEqual([]);
  });

  test('bubbles DDB errors', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('Scan failed'));
    const repo = new DynamoGeocodeRepo(TABLE);
    await expect(repo.listAllCellKeys()).rejects.toThrow('Scan failed');
  });
});
