import type { APIGatewayProxyResult, Context } from 'aws-lambda';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../lib/config.js';
import type { GeocodeRepo } from '../lib/schema.js';
import { DynamoGeocodeRepo } from '../repos/geocodeRepo.js';
import { WeatherRepo } from '../repos/weatherRepo.js';
import { AlertsRepo } from '../repos/alertsRepo.js';
import { haversineKm, round2dp, cellKey } from '../lib/geo.js';
import { withHttp } from '../middleware/index.js';
import { sqsClient } from '../lib/sqs.js';
import { logger } from '../lib/observability.js';
import type { ResolvedEvent } from '../lib/schema.js';

// Module-scoped singletons (cold-start init only)
const geocodeRepo: GeocodeRepo = new DynamoGeocodeRepo(config.GEOCODE_TABLE);
const weatherRepo = new WeatherRepo(config.WEATHER_TABLE);
const alertsRepo = new AlertsRepo(config.ALERTS_TABLE);

export async function baseHandler(
  event: ResolvedEvent,
  _context: Context,
): Promise<APIGatewayProxyResult> {
  const { lat, lon, geo } = event.resolved;

  const lat_2dp = round2dp(lat);
  const lon_2dp = round2dp(lon);

  const [weather, stateAlerts, quakes] = await Promise.all([
    weatherRepo.get(lat_2dp, lon_2dp),
    alertsRepo.getByState(geo.state),
    alertsRepo.getEarthquakes(),
  ]);

  // Cold-start path: no weather yet for this cell — enqueue so the next poll has data.
  // FIFO dedup: duplicate enqueues within 5 min collapse to one fetch per cell.
  if (!weather) {
    const key = cellKey(lat_2dp, lon_2dp);
    void sqsClient
      .send(
        new SendMessageCommand({
          QueueUrl: config.WEATHER_QUEUE_URL!,
          MessageBody: key,
          MessageGroupId: key,
          MessageDeduplicationId: key,
        }),
      )
      .catch((err: unknown) =>
        logger.warn('cold_fetch_enqueue_failed', { err, lat_2dp, lon_2dp }),
      );
  }

  // City lookup: single MessageGroupId forces strict serial processing across all cells
  // (Nominatim's 1 rps policy). Dedup window collapses storms per cell.
  if (geo.city == null && config.CITY_LOOKUP_QUEUE_URL) {
    const key = cellKey(lat_2dp, lon_2dp);
    void sqsClient
      .send(
        new SendMessageCommand({
          QueueUrl: config.CITY_LOOKUP_QUEUE_URL,
          MessageBody: key,
          MessageGroupId: 'city',
          MessageDeduplicationId: key,
        }),
      )
      .catch((err: unknown) =>
        logger.warn('city_enqueue_failed', { err, lat_2dp, lon_2dp }),
      );
  }

  // Fail-closed: empty affected_zones with is_state_wide=false → do not surface
  const relevantAlerts = stateAlerts.filter(
    (a) =>
      a.is_state_wide ||
      a.affected_zones.includes(geo.county_zone) ||
      a.affected_zones.includes(geo.forecast_zone),
  );

  const relevantQuakes = quakes.filter((q) => haversineKm(lat, lon, q.lat, q.lon) <= 300);

  const now = Math.floor(Date.now() / 1000);
  const isStale = weather ? now - weather.fetched_at > config.WEATHER_FRESH_SECONDS : false;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=60',
      'Access-Control-Allow-Origin': config.CORS_ALLOW_ORIGIN,
    },
    body: JSON.stringify({
      lat,
      lon,
      as_of: new Date().toISOString(),
      location: {
        state: geo.state,
        county_zone: geo.county_zone,
        forecast_zone: geo.forecast_zone,
        time_zone: geo.time_zone,
        city: geo.city ?? null,
      },
      weather: weather
        ? {
            ...weather.payload,
            fetched_at: weather.fetched_at,
            is_stale: isStale,
          }
        : null,
      alerts: relevantAlerts,
      earthquakes: relevantQuakes,
    }),
  };
}

export const handler = withHttp(baseHandler, geocodeRepo);
