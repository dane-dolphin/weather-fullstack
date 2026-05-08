import { z } from 'zod';
import type { Alert } from '../lib/schema.js';
import { config } from '../lib/config.js';
import { UpstreamError } from '../lib/errors.js';

export const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

const STATE_FULL_NAMES: Readonly<Record<string, string>> = {
  AL: 'Alabama',       AK: 'Alaska',        AZ: 'Arizona',       AR: 'Arkansas',
  CA: 'California',    CO: 'Colorado',      CT: 'Connecticut',   DE: 'Delaware',
  FL: 'Florida',       GA: 'Georgia',       HI: 'Hawaii',        ID: 'Idaho',
  IL: 'Illinois',      IN: 'Indiana',       IA: 'Iowa',          KS: 'Kansas',
  KY: 'Kentucky',      LA: 'Louisiana',     ME: 'Maine',         MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan',      MN: 'Minnesota',     MS: 'Mississippi',
  MO: 'Missouri',      MT: 'Montana',       NE: 'Nebraska',      NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey',    NM: 'New Mexico',    NY: 'New York',
  NC: 'North Carolina',ND: 'North Dakota',  OH: 'Ohio',          OK: 'Oklahoma',
  OR: 'Oregon',        PA: 'Pennsylvania',  RI: 'Rhode Island',  SC: 'South Carolina',
  SD: 'South Dakota',  TN: 'Tennessee',     TX: 'Texas',         UT: 'Utah',
  VT: 'Vermont',       VA: 'Virginia',      WA: 'Washington',    WV: 'West Virginia',
  WI: 'Wisconsin',     WY: 'Wyoming',
};

const SEVERITY_MAP: Record<string, Alert['severity']> = {
  Extreme: 'Extreme',
  Severe: 'Severe',
  Moderate: 'Moderate',
  Minor: 'Minor',
};

const NwsFeaturePropertiesSchema = z.looseObject({
  id: z.string(),
  event: z.string(),
  severity: z.string(),
  areaDesc: z.string().default(''),
  effective: z.string(),
  expires: z.string(),
  headline: z.string().nullable().optional().transform((v) => v ?? null),
  description: z.string().nullable().optional().transform((v) => v ?? null),
  affectedZones: z.array(z.string()).default([]),
  geocode: z
    .looseObject({
      UGC: z.array(z.string()).default([]),
      SAME: z.array(z.string()).default([]),
    })
    .optional(),
});

const NwsFeatureSchema = z.looseObject({
  properties: NwsFeaturePropertiesSchema,
});

const NwsResponseSchema = z.looseObject({
  features: z.array(NwsFeatureSchema),
});

type NwsFeature = z.infer<typeof NwsFeatureSchema>;

function adaptFeature(feature: NwsFeature, state: string): Alert | null {
  const p = feature.properties;

  // Extract zone codes from affectedZones URLs (last path segment, e.g. "TXZ192").
  const fromUrls = p.affectedZones
    .map((url) => url.split('/').pop())
    .filter((code): code is string => Boolean(code));

  // UGC codes are already bare zone codes (e.g. "TXZ192").
  const fromUgc = p.geocode?.UGC ?? [];

  // Union of both sources, deduplicated.
  const affected_zones = [...new Set([...fromUrls, ...fromUgc])];

  // is_state_wide only when explicit:
  //   • areaDesc exactly matches the state's full name, OR
  //   • geocode.SAME contains a county-000 entry (state-level SAME code).
  // Empty affected_zones is NOT treated as state-wide (fail closed).
  const sameHasStateWide = (p.geocode?.SAME ?? []).some((code) => code.endsWith('000'));
  const areaDescIsStateName = p.areaDesc === (STATE_FULL_NAMES[state] ?? '');
  const is_state_wide = sameHasStateWide || areaDescIsStateName;

  // Fail closed: if no zones could be determined and the alert is not explicitly
  // state-wide, drop it rather than broadcasting to the entire state.
  if (affected_zones.length === 0 && !is_state_wide) {
    return null;
  }

  return {
    alert_id: p.id,
    state,
    event: p.event,
    severity: SEVERITY_MAP[p.severity] ?? 'Unknown',
    headline: p.headline,
    description: p.description,
    affected_zones,
    is_state_wide,
    effective: p.effective,
    expires: p.expires,
    source: 'nws',
  };
}

export async function fetchActiveAlertsForState(state: string): Promise<Alert[]> {
  const url = `https://api.weather.gov/alerts/active?area=${state}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': config.NWS_USER_AGENT,
      Accept: 'application/geo+json',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new UpstreamError('nws_error', 502, `NWS ${state}: ${res.status}`);
  }
  let parsed: z.infer<typeof NwsResponseSchema>;
  try {
    parsed = NwsResponseSchema.parse(await res.json());
  } catch {
    throw new UpstreamError('nws_parse_error', 502, `NWS ${state}: invalid response schema`);
  }
  return parsed.features
    .map((f) => adaptFeature(f, state))
    .filter((a): a is Alert => a !== null);
}
