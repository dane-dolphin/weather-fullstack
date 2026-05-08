import type { ApiSuccess } from '@/api/types';
import type { BannerAlert } from './types';
import { formatTime } from './format';

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};

const NWS_KIND: Record<string, BannerAlert['kind']> = {
  'Tornado Warning': 'tornado',
  'Tornado Watch': 'tornado',
  'Severe Thunderstorm Warning': 'severe',
  'Severe Thunderstorm Watch': 'severe',
  'Flood Warning': 'flood',
  'Flash Flood Warning': 'flood',
  'Winter Storm Warning': 'winter',
  'Blizzard Warning': 'winter',
  'Excessive Heat Warning': 'heat',
  'Heat Advisory': 'heat',
};

export function pickPrimaryAlert(api: ApiSuccess): BannerAlert | null {
  if (api.alerts.length > 0) {
    const sorted = [...api.alerts].sort(
      (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0),
    );
    const top = sorted[0]!;
    return {
      kind: NWS_KIND[top.event] ?? 'warning',
      tag: top.event.toUpperCase(),
      title: top.headline ?? top.event,
      message: top.description ?? '',
      meta: `Until ${formatTime(top.expires)}`,
      source: 'NWS',
    };
  }

  if (api.earthquakes.length > 0) {
    const sorted = [...api.earthquakes].sort((a, b) => b.magnitude - a.magnitude);
    const top = sorted[0]!;
    return {
      kind: 'earthquake',
      tag: 'EARTHQUAKE',
      title: `Magnitude ${top.magnitude.toFixed(1)} — ${top.place}`,
      message: `USGS detected a M${top.magnitude.toFixed(1)} earthquake near ${top.place}.`,
      meta: formatTime(new Date(top.time)),
      source: 'USGS',
    };
  }

  return null;
}
