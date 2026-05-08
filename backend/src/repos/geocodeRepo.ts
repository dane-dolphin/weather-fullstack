import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import type { GeocodeEntry, GeocodeRepo } from '../lib/schema.js';
import { ddbDoc } from '../lib/ddb.js';
import { cellKey, parseCellKey } from '../lib/geo.js';

export class DynamoGeocodeRepo implements GeocodeRepo {
  constructor(
    private readonly tableName: string,
    private readonly ddb: DynamoDBDocumentClient = ddbDoc,
  ) {}

  async get(lat_2dp: number, lon_2dp: number): Promise<GeocodeEntry | null> {
    const pk = cellKey(lat_2dp, lon_2dp);
    const result = await this.ddb.send(
      new GetCommand({ TableName: this.tableName, Key: { pk } }),
    );
    if (!result.Item) return null;
    const { pk: _pk, ...entry } = result.Item as GeocodeEntry & { pk: string };
    return entry;
  }

  async put(entry: GeocodeEntry): Promise<GeocodeEntry> {
    const pk = cellKey(entry.lat_2dp, entry.lon_2dp);
    await this.ddb.send(
      new PutCommand({ TableName: this.tableName, Item: { ...entry, pk } }),
    );
    return entry;
  }

  async updateCity(lat_2dp: number, lon_2dp: number, city: string): Promise<void> {
    const pk = cellKey(lat_2dp, lon_2dp);
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk },
        UpdateExpression: 'SET city = :c',
        ExpressionAttributeValues: { ':c': city },
      }),
    );
  }

  async listAllCellKeys(): Promise<Array<{ lat_2dp: number; lon_2dp: number }>> {
    const keys: Array<{ lat_2dp: number; lon_2dp: number }> = [];
    let lastKey: ScanCommandInput['ExclusiveStartKey'] = undefined;

    do {
      const result = await this.ddb.send(
        new ScanCommand({
          TableName: this.tableName,
          ProjectionExpression: 'pk',
          ExclusiveStartKey: lastKey,
        }),
      );

      for (const item of result.Items ?? []) {
        const { lat, lon } = parseCellKey(item['pk'] as string);
        keys.push({ lat_2dp: lat, lon_2dp: lon });
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc TS2322 without this; ScanCommandOutput['LastEvaluatedKey'] type is not directly assignable to ScanCommandInput['ExclusiveStartKey'] in all SDK versions
      lastKey = result.LastEvaluatedKey as ScanCommandInput['ExclusiveStartKey'];
    } while (lastKey !== undefined);

    return keys;
  }
}
