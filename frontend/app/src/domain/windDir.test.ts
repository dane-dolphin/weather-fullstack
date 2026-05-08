import { describe, it, expect } from 'vitest';
import { compass } from './windDir';

describe('compass', () => {
  it.each([
    [0, 'N'],
    [22.5, 'NNE'],
    [45, 'NE'],
    [67.5, 'ENE'],
    [90, 'E'],
    [112.5, 'ESE'],
    [135, 'SE'],
    [157.5, 'SSE'],
    [180, 'S'],
    [202.5, 'SSW'],
    [225, 'SW'],
    [247.5, 'WSW'],
    [270, 'W'],
    [292.5, 'WNW'],
    [315, 'NW'],
    [337.5, 'NNW'],
  ] as [number, string][])('%f° → %s', (deg, expected) => {
    expect(compass(deg)).toBe(expected);
  });

  it('360° wraps to N', () => {
    expect(compass(360)).toBe('N');
  });

  it('negative degrees normalize correctly', () => {
    expect(compass(-180)).toBe('S');
    expect(compass(-90)).toBe('W');
  });

  it('angles above 360 normalize correctly', () => {
    expect(compass(405)).toBe('NE');
  });
});
