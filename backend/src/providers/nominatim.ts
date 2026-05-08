import { z } from 'zod';
import { config } from '../lib/config.js';
import { logger } from '../lib/observability.js';

const ReverseResponse = z.object({
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      county: z.string().optional(),
    })
    .optional(),
});

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn('nominatim_non_ok', { lat, lon, status: res.status });
      return null;
    }
    const parsed = ReverseResponse.safeParse(await res.json());
    if (!parsed.success) {
      logger.warn('nominatim_parse_failed', { lat, lon, err: parsed.error.message });
      return null;
    }
    const a = parsed.data.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.county ?? null;
  } catch (err: unknown) {
    logger.warn('nominatim_fetch_failed', { lat, lon, err });
    return null;
  }
}
