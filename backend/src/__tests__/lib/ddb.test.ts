import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getItem, putItem, query } from '../../lib/ddb.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('getItem', () => {
  test('returns typed Item when found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: 'foo', value: 42 } });
    const result = await getItem<{ pk: string; value: number }>('test-table', { pk: 'foo' });
    expect(result).toEqual({ pk: 'foo', value: 42 });
  });

  test('returns null when Item is undefined', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getItem('test-table', { pk: 'missing' });
    expect(result).toBeNull();
  });

  test('passes correct TableName and Key', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: 'bar' } });
    await getItem('my-table', { pk: 'bar', sk: 'baz' });
    const calls = ddbMock.commandCalls(GetCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({ TableName: 'my-table', Key: { pk: 'bar', sk: 'baz' } });
  });
});

describe('putItem', () => {
  test('resolves without returning a value', async () => {
    ddbMock.on(PutCommand).resolves({});
    await expect(putItem('test-table', { pk: 'foo', value: 1 })).resolves.toBeUndefined();
  });

  test('passes correct TableName and Item', async () => {
    ddbMock.on(PutCommand).resolves({});
    await putItem('test-table', { pk: 'foo', value: 1 });
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: 'test-table',
      Item: { pk: 'foo', value: 1 },
    });
  });

  test('merges extra options into PutCommand', async () => {
    ddbMock.on(PutCommand).resolves({});
    await putItem('test-table', { pk: 'foo' }, { ConditionExpression: 'attribute_not_exists(pk)' });
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(pk)');
  });
});

describe('query', () => {
  test('returns Items array when results exist', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'a' }, { pk: 'b' }] });
    const result = await query<{ pk: string }>({
      TableName: 'test-table',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'a' },
    });
    expect(result).toEqual([{ pk: 'a' }, { pk: 'b' }]);
  });

  test('returns empty array when Items is undefined', async () => {
    ddbMock.on(QueryCommand).resolves({});
    const result = await query({
      TableName: 'test-table',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'x' },
    });
    expect(result).toEqual([]);
  });

  test('passes params through to QueryCommand', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await query({ TableName: 'my-table', KeyConditionExpression: 'pk = :v', ExpressionAttributeValues: { ':v': 'z' } });
    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[0].args[0].input.TableName).toBe('my-table');
  });
});
