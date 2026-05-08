import { z } from 'zod';
import type { Earthquake } from '../lib/schema.js';
import { config } from '../lib/config.js';
import { UpstreamError } from '../lib/errors.js';

const UsgsFeatureSchema = z.looseObject({
  id: z.string(),
  properties: z.looseObject({
    mag: z.number().nullable(),
    place: z.string().nullable(),
    time: z.number(),
  }),
  geometry: z.looseObject({
    coordinates: z.array(z.number()), // [lon, lat, depth_km]
  }),
});

const UsgsResponseSchema = z.looseObject({
  features: z.array(UsgsFeatureSchema),
});

type UsgsFeature = z.infer<typeof UsgsFeatureSchema>;

function adaptFeature(f: UsgsFeature): Earthquake | null {
  const coords = f.geometry.coordinates;
  // Skip if coordinates are incomplete (e.g. USGS occasionally omits depth-only entries)
  if (coords.length < 2) return null;
  // Skip events with no magnitude (USGS may emit null for non-seismic events)
  if (f.properties.mag === null) return null;
  return {
    quake_id: f.id,
    magnitude: f.properties.mag,
    place: f.properties.place ?? '',
    time: f.properties.time,
    lon: coords[0],
    lat: coords[1],
  };
}

export async function fetchSignificantQuakes(): Promise<Earthquake[]> {
  const res = await fetch(config.USGS_FEED_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new UpstreamError('usgs_error', 502, `USGS: ${res.status}`);
  let parsed: z.infer<typeof UsgsResponseSchema>;
  try {
    parsed = UsgsResponseSchema.parse(await res.json());
  } catch {
    throw new UpstreamError('usgs_parse_error', 502, 'USGS: invalid response schema');
  }
  return parsed.features.map(adaptFeature).filter((eq): eq is Earthquake => eq !== null);
}
