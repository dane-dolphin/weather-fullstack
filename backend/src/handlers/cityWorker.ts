import type { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { setTimeout as sleep } from 'timers/promises';
import { config } from '../lib/config.js';
import { DynamoGeocodeRepo } from '../repos/geocodeRepo.js';
import { reverseGeocode } from '../providers/nominatim.js';
import { parseCellKey, round2dp } from '../lib/geo.js';
import { logger } from '../lib/observability.js';
import { withObservability } from '../middleware/index.js';

const geocodeRepo = new DynamoGeocodeRepo(config.GEOCODE_TABLE);
const processor = new BatchProcessor(EventType.SQS);

async function recordHandler(record: SQSRecord): Promise<void> {
  const { lat, lon } = parseCellKey(record.body);
  const city = await reverseGeocode(lat, lon);
  if (city) {
    await geocodeRepo.updateCity(round2dp(lat), round2dp(lon), city);
    logger.info('city_stored', { lat, lon, city });
  } else {
    logger.info('city_not_found', { lat, lon });
  }
  // Nominatim public usage policy: ≤1 req/sec. FIFO single MessageGroupId serializes
  // delivery; this generous sleep keeps us well clear of the limit.
  await sleep(5000);
}

async function baseHandler(event: SQSEvent, context: Context) {
  return processPartialResponse(event, recordHandler, processor, { context });
}

export const handler = withObservability(baseHandler);
