import { ValidationError } from './errors.js';

// JS Math.round rounds half-values toward +∞, giving asymmetric behavior at .x05 boundaries:
// round2dp(0.005) === 0.01 but round2dp(-0.005) === 0 (not -0.01).
// This asymmetry is intentional and pinned by tests — do not "fix" it.
export function round2dp(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round1dp(n: number): number {
  return Math.round(n * 10) / 10;
}

const R = 6371; // Earth radius in km

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function cellKey(lat: number, lon: number): string {
  return `LL#${round2dp(lat)}#${round2dp(lon)}`;
}

export function parseCellKey(s: string): { lat: number; lon: number } {
  const parts = s.split('#');
  if (parts.length !== 3 || parts[0] !== 'LL') {
    throw new ValidationError(`Malformed cell key: ${s}`);
  }
  const lat = parseFloat(parts[1]);
  const lon = parseFloat(parts[2]);
  if (isNaN(lat) || isNaN(lon)) {
    throw new ValidationError(`Malformed cell key components: ${s}`);
  }
  return { lat, lon };
}
