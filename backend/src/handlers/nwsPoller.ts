import type { Context } from 'aws-lambda';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { STATES, fetchActiveAlertsForState } from '../providers/nws.js';
import { AlertsRepo } from '../repos/alertsRepo.js';
import { config } from '../lib/config.js';
import { withObservability } from '../middleware/index.js';
import { logger, metrics } from '../lib/observability.js';

const alertsRepo = new AlertsRepo(config.ALERTS_TABLE);

async function baseHandler(_event: unknown, _context: Context): Promise<void> {
  const results = await Promise.allSettled(
    STATES.map((state) => fetchActiveAlertsForState(state)),
  );
  let okStates = 0;
  let failedStates = 0;

  for (let i = 0; i < STATES.length; i++) {
    const state = STATES[i];
    const result = results[i];
    if (result.status === 'rejected') {
      failedStates++;
      logger.warn('nws_state_failed', { state, err: (result.reason as Error | undefined)?.message });
      continue;
    }
    okStates++;
    if (result.value.length === 0) continue;
    await alertsRepo.batchPutAlerts(state, result.value);
  }

  metrics.addMetric('NwsStatesOk', MetricUnit.Count, okStates);
  metrics.addMetric('NwsStatesFailed', MetricUnit.Count, failedStates);
  logger.info('nws_poll_complete', { okStates, failedStates });
}

export const handler = withObservability(baseHandler);
