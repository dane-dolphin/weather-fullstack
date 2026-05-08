import type { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { config } from '../lib/config.js';
import { WeatherRepo } from '../repos/weatherRepo.js';
import { weatherProvider } from '../providers/index.js';
import { parseCellKey, round2dp } from '../lib/geo.js';
import { logger } from '../lib/observability.js';
import { withObservability } from '../middleware/index.js';

const weatherRepo = new WeatherRepo(config.WEATHER_TABLE);
const processor = new BatchProcessor(EventType.SQS);

async function recordHandler(record: SQSRecord): Promise<void> {
  const { lat, lon } = parseCellKey(record.body);
  const snapshot = await weatherProvider.fetch(lat, lon);
  await weatherRepo.put(round2dp(lat), round2dp(lon), snapshot);
  logger.info('weather_stored', { lat, lon, source: snapshot.source });
}

async function baseHandler(event: SQSEvent, context: Context) {
  return processPartialResponse(event, recordHandler, processor, { context });
}

export const handler = withObservability(baseHandler);
