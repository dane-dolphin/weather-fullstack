import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const ddbDoc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
});

export async function getItem<T>(
  tableName: string,
  key: Record<string, unknown>,
): Promise<T | null> {
  const result = await ddbDoc.send(new GetCommand({ TableName: tableName, Key: key }));
  return (result.Item as T | undefined) ?? null;
}

export async function putItem(
  tableName: string,
  item: Record<string, unknown>,
  options?: Partial<Omit<PutCommandInput, 'TableName' | 'Item'>>,
): Promise<void> {
  await ddbDoc.send(new PutCommand({ TableName: tableName, Item: item, ...options }));
}

export async function query<T>(
  params: QueryCommandInput,
): Promise<T[]> {
  const result = await ddbDoc.send(new QueryCommand(params));
  return (result.Items as T[] | undefined) ?? [];
}
