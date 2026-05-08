import { describe, it, expect } from 'vitest';
import { categorize } from './weatherCode';

describe('categorize', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'partly'],
    [3, 'overcast'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'rain'],
    [53, 'rain'],
    [55, 'rain'],
    [61, 'rain'],
    [63, 'rain'],
    [65, 'rain'],
    [80, 'rain'],
    [81, 'rain'],
    [82, 'rain'],
    [71, 'snow'],
    [73, 'snow'],
    [75, 'snow'],
    [77, 'snow'],
    [85, 'snow'],
    [86, 'snow'],
    [95, 'thunder'],
    [96, 'thunder'],
    [99, 'thunder'],
  ] as [number, string][])('code %i → %s', (code, expected) => {
    expect(categorize(code)).toBe(expected);
  });

  it('unknown code falls back to clear', () => {
    expect(categorize(4)).toBe('clear');
    expect(categorize(999)).toBe('clear');
  });
});
