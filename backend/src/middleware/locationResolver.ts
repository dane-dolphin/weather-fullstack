import type { MiddlewareObj } from '@middy/core';
import { z } from 'zod';
import type { GeocodeRepo } from '../lib/schema.js';
import { resolvePoint } from '../lib/nwsPoints.js';
import { round2dp } from '../lib/geo.js';
import { ValidationError } from '../lib/errors.js';
import { logger } from '../lib/observability.js';
import { config } from '../lib/config.js';

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export function locationResolver(repo: GeocodeRepo): MiddlewareObj {
  return {
    before: async (request) => {
      const event = request.event as { queryStringParameters?: Record<string, string> };
      const parsed = QuerySchema.safeParse(event.queryStringParameters ?? {});
      if (!parsed.success) {
        throw new ValidationError(z.prettifyError(parsed.error));
      }
      const { lat, lon } = parsed.data;
      const lat_2dp = round2dp(lat);
      const lon_2dp = round2dp(lon);

      let geo = await repo.get(lat_2dp, lon_2dp);
      const now = Math.floor(Date.now() / 1000);

      if (!geo) {
        logger.info('geocode_resolve_sync', { lat_2dp, lon_2dp });
        const resolved = await resolvePoint(lat_2dp, lon_2dp);
        geo = await repo.put({ lat_2dp, lon_2dp, ...resolved, resolved_at: now });
      } else if ((geo.resolved_at ?? 0) < now - config.GEOCODE_REFRESH_SECONDS) {
        logger.info('geocode_refresh_async', { lat_2dp, lon_2dp });
        // Caveat: Lambda may freeze the container after responding, cutting off the floating
        // promise. Acceptable for v1 — a missed refresh just retries on the next call.
        const existingCity = geo.city;
        void resolvePoint(lat_2dp, lon_2dp)
          .then((r) =>
            repo.put({ lat_2dp, lon_2dp, ...r, resolved_at: now, city: existingCity }),
          )
          .catch((err: unknown) =>
            logger.warn('geocode_refresh_failed', { err, lat_2dp, lon_2dp }),
          );
      }

      // Type mutation accepted here: Middy's TEvent doesn't model the resolved extension.
      (request.event as Record<string, unknown>).resolved = { lat, lon, geo };
    },
  };
}
