import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import type { Context } from 'aws-lambda';
import { logger, tracer, metrics } from '../lib/observability.js';
import { errorHandler } from './errorHandler.js';
import { locationResolver } from './locationResolver.js';
import type { GeocodeRepo } from '../lib/schema.js';

type LambdaHandler<TEvent, TResult> = (
  event: TEvent,
  context: Context,
) => Promise<TResult>;

export function withObservability<TEvent, TResult>(
  handler: LambdaHandler<TEvent, TResult>,
) {
  return middy(handler)
    .use(injectLambdaContext(logger, { logEvent: false, clearState: true }))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }));
}

export function withHttp<TEvent, TResult>(
  handler: LambdaHandler<TEvent, TResult>,
  geocodeRepo: GeocodeRepo,
) {
  return withObservability(handler)
    .use(locationResolver(geocodeRepo))
    .use(errorHandler());
}
