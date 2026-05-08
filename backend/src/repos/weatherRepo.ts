import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { WeatherSnapshot } from '../lib/schema.js';
import { ddbDoc } from '../lib/ddb.js';
import { cellKey } from '../lib/geo.js';
import { config } from '../lib/config.js';

export type WeatherRecord = {
  payload: WeatherSnapshot;
  fetched_at: number;
};

export class WeatherRepo {
  constructor(
    private readonly tableName: string,
    private readonly ddb: DynamoDBDocumentClient = ddbDoc,
  ) {}

  async get(lat2dp: number, lon2dp: number): Promise<WeatherRecord | null> {
    const pk = cellKey(lat2dp, lon2dp);
    const result = await this.ddb.send(
      new GetCommand({ TableName: this.tableName, Key: { pk } }),
    );
    if (!result.Item) return null;
    const { payload, fetched_at } = result.Item as WeatherRecord & { pk: string; ttl: number };
    return { payload, fetched_at };
  }

  async put(lat2dp: number, lon2dp: number, snapshot: WeatherSnapshot): Promise<void> {
    const pk = cellKey(lat2dp, lon2dp);
    const now = Math.floor(Date.now() / 1000);
    try {
      await this.ddb.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { pk, payload: snapshot, fetched_at: now, ttl: now + config.WEATHER_TTL_SECONDS },
          ConditionExpression: 'attribute_not_exists(fetched_at) OR fetched_at < :incoming',
          ExpressionAttributeValues: { ':incoming': now },
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return;
      throw err;
    }
  }
}
