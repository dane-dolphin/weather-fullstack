import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { config } from './config.js';

const SERVICE = 'weather-backend';

export const logger = new Logger({ serviceName: SERVICE, logLevel: config.LOG_LEVEL });
export const tracer = new Tracer({ serviceName: SERVICE });
export const metrics = new Metrics({ namespace: 'WeatherBackend', serviceName: SERVICE });
