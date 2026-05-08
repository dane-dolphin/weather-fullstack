import type { Context } from 'aws-lambda';
import { fetchSignificantQuakes } from '../providers/usgs.js';
import { AlertsRepo } from '../repos/alertsRepo.js';
import { config } from '../lib/config.js';
import { withObservability } from '../middleware/index.js';
import { logger } from '../lib/observability.js';

const alertsRepo = new AlertsRepo(config.ALERTS_TABLE);

async function baseHandler(_event: unknown, _context: Context): Promise<void> {
  const quakes = await fetchSignificantQuakes();
  for (const quake of quakes) {
    await alertsRepo.putEarthquake(quake);
  }
  logger.info('earthquake_poll_complete', { count: quakes.length });
}

export const handler = withObservability(baseHandler);
