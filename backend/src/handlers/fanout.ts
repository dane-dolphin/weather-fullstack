import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import type { Context } from 'aws-lambda';
import { createHash } from 'crypto';
import { config } from '../lib/config.js';
import { DynamoGeocodeRepo } from '../repos/geocodeRepo.js';
import { cellKey } from '../lib/geo.js';
import { sqsClient } from '../lib/sqs.js';
import { logger } from '../lib/observability.js';
import { withObservability } from '../middleware/index.js';

const geocodeRepo = new DynamoGeocodeRepo(config.GEOCODE_TABLE);

function shortHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function chunked<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function baseHandler(_event: unknown, _context: Context): Promise<void> {
  const cells = await geocodeRepo.listAllCellKeys();
  const messages = cells.map((c) => cellKey(c.lat_2dp, c.lon_2dp));

  // SQS FIFO: chunk to 10 per SendMessageBatch call (API limit).
  // ContentBasedDeduplication is on, but MessageDeduplicationId is set explicitly
  // so the 5-min dedup window collapses concurrent fanout storms to one fetch per cell.
  for (const chunk of chunked(messages, 10)) {
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: config.WEATHER_QUEUE_URL!,
        Entries: chunk.map((body) => ({
          Id: shortHash(body),
          MessageBody: body,
          MessageGroupId: body,
          MessageDeduplicationId: body,
        })),
      }),
    );
  }

  logger.info('fanout_complete', { cells: cells.length });
}

export const handler = withObservability(baseHandler);
