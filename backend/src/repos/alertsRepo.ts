import { DynamoDBDocumentClient, QueryCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Alert, Earthquake } from '../lib/schema.js';
import { ddbDoc } from '../lib/ddb.js';
import { config } from '../lib/config.js';

type StoredAlert = Alert & { pk: string; sk: string; ttl: number };
type StoredEarthquake = Earthquake & { pk: string; sk: string; ttl: number };

export class AlertsRepo {
  constructor(
    private readonly tableName: string,
    private readonly ddb: DynamoDBDocumentClient = ddbDoc,
  ) {}

  async getByState(state: string): Promise<Alert[]> {
    const result = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `STATE#${state}` },
      }),
    );
    return ((result.Items as StoredAlert[] | undefined) ?? []).map(
      ({ pk: _pk, sk: _sk, ttl: _ttl, ...alert }) => alert,
    );
  }

  async getEarthquakes(): Promise<Earthquake[]> {
    const result = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': 'QUAKE#GLOBAL' },
      }),
    );
    return ((result.Items as StoredEarthquake[] | undefined) ?? []).map(
      ({ pk: _pk, sk: _sk, ttl: _ttl, ...eq }) => eq,
    );
  }

  async putAlert(state: string, alert: Alert): Promise<void> {
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `STATE#${state}`,
          sk: `ALERT#${alert.alert_id}`,
          ...alert,
          ttl: Math.floor(new Date(alert.expires).getTime() / 1000),
        },
      }),
    );
  }

  async putEarthquake(eq: Earthquake): Promise<void> {
    const ttl = Math.floor(eq.time / 1000) + config.EARTHQUAKE_TTL_SECONDS;
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: 'QUAKE#GLOBAL',
          sk: `QUAKE#${eq.quake_id}`,
          ...eq,
          ttl,
        },
      }),
    );
  }

  async batchPutAlerts(state: string, alerts: Alert[]): Promise<void> {
    for (let i = 0; i < alerts.length; i += 25) {
      const chunk = alerts.slice(i, i + 25);
      await this.ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((alert) => ({
              PutRequest: {
                Item: {
                  pk: `STATE#${state}`,
                  sk: `ALERT#${alert.alert_id}`,
                  ...alert,
                  ttl: Math.floor(new Date(alert.expires).getTime() / 1000),
                },
              },
            })),
          },
        }),
      );
    }
  }
}
