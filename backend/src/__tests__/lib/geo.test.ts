import { describe, test, expect } from '@jest/globals';
import {
  round2dp,
  round1dp,
  haversineKm,
  cellKey,
  parseCellKey,
} from '../../lib/geo.js';

describe('round2dp', () => {
  test('basic rounding', () => {
    expect(round2dp(1.234)).toBe(1.23);
    expect(round2dp(1.235)).toBe(1.24); // FP 1.235 is slightly above 1.235, rounds up
    // FP 1.005 is slightly below 1.005; 1.005*100 < 100.5 → rounds to 100 → 1
    expect(round2dp(1.005)).toBe(1);
  });

  // Pin the JS half-toward-+∞ asymmetry at .x05 boundaries.
  // This test exists so a "symmetric" rounding refactor can't silently re-key geocode_cache rows.
  test('0.005 rounds UP to 0.01 (half-toward-+∞)', () => {
    expect(round2dp(0.005)).toBe(0.01);
  });

  test('-0.005 rounds to 0, NOT -0.01 (JS Math.round(-0.5) = -0 per spec)', () => {
    // Math.round(-0.5) === -0 in JavaScript; add +0 to normalise to positive zero for assertion.
    expect(round2dp(-0.005) + 0).toBe(0);
  });

  test('zero', () => {
    expect(round2dp(0)).toBe(0);
  });

  test('negative value', () => {
    // FP -1.235 is slightly below mathematical -1.235 → rounds to -1.24
    expect(round2dp(-1.235)).toBe(-1.24);
    expect(round2dp(-1.234)).toBe(-1.23);
  });

  test('exact 2dp value unchanged', () => {
    expect(round2dp(40.71)).toBe(40.71);
    expect(round2dp(-74.01)).toBe(-74.01);
  });
});

describe('round1dp', () => {
  test('basic rounding', () => {
    expect(round1dp(1.25)).toBe(1.3);
    expect(round1dp(1.24)).toBe(1.2);
  });

  test('0.05 rounds UP (same half-toward-+∞ behavior)', () => {
    expect(round1dp(0.05)).toBe(0.1);
  });

  test('-0.05 rounds to 0 (Math.round(-0.5) = -0; normalised with +0)', () => {
    expect(round1dp(-0.05) + 0).toBe(0);
  });
});

describe('haversineKm', () => {
  // NYC (40.7128, -74.006) → LAX (33.9425, -118.4081): great-circle ~3954 km
  test('NYC to LAX ≈ 3954 km ±10', () => {
    const dist = haversineKm(40.7128, -74.006, 33.9425, -118.4081);
    expect(dist).toBeGreaterThan(3944);
    expect(dist).toBeLessThan(3964);
  });

  test('same point is 0 km', () => {
    expect(haversineKm(40.71, -74.01, 40.71, -74.01)).toBe(0);
  });

  test('short distance is positive and small', () => {
    const dist = haversineKm(40.71, -74.01, 40.72, -74.01);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(5);
  });
});

describe('cellKey', () => {
  test('produces canonical format', () => {
    expect(cellKey(40.7128, -74.0061)).toBe('LL#40.71#-74.01');
  });

  test('rounds to 2dp', () => {
    expect(cellKey(40.7, -74.0)).toBe('LL#40.7#-74');
  });

  test('round-trip with parseCellKey', () => {
    const result = parseCellKey(cellKey(40.7128, -74.0061));
    expect(result.lat).toBe(40.71);
    expect(result.lon).toBe(-74.01);
  });
});

describe('parseCellKey', () => {
  test('parses valid key', () => {
    const result = parseCellKey('LL#40.71#-74.01');
    expect(result.lat).toBe(40.71);
    expect(result.lon).toBe(-74.01);
  });

  test('throws on wrong prefix', () => {
    expect(() => parseCellKey('XX#40.71#-74.01')).toThrow();
  });

  test('throws on missing hash segments', () => {
    expect(() => parseCellKey('LL#40.71')).toThrow();
  });

  test('throws on non-numeric components', () => {
    expect(() => parseCellKey('LL#abc#def')).toThrow();
  });

  test('throws on empty string', () => {
    expect(() => parseCellKey('')).toThrow();
  });
});
