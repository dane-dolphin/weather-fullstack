import { describe, it, expect } from 'vitest';
import {
  formatTemp,
  formatTime,
  formatDate,
  formatHourLabel,
  formatWind,
  formatExpiresLabel,
} from './format';

describe('formatTemp', () => {
  it('rounds up', () => expect(formatTemp(77.6)).toBe('78'));
  it('rounds down', () => expect(formatTemp(77.4)).toBe('77'));
  it('exact integer', () => expect(formatTemp(72)).toBe('72'));
  it('negative value', () => expect(formatTemp(-5.7)).toBe('-6'));
});

describe('formatWind', () => {
  it('rounds up', () => expect(formatWind(9.8)).toBe('10'));
  it('rounds down', () => expect(formatWind(9.2)).toBe('9'));
  it('exact integer', () => expect(formatWind(12)).toBe('12'));
});

describe('formatTime', () => {
  it('accepts a Date object', () => {
    const result = formatTime(new Date('2025-02-25T16:43:00Z'));
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it('accepts an ISO string', () => {
    const result = formatTime('2025-02-25T16:43:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });
});

describe('formatDate', () => {
  it('returns weekday · month day · time', () => {
    const result = formatDate(new Date('2025-02-25T16:43:00Z'));
    expect(result).toMatch(/^[A-Za-z]+ · [A-Za-z]+ \d+ · \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2025-02-25T16:43:00Z');
    expect(result).toMatch(/^[A-Za-z]+ · [A-Za-z]+ \d+ · \d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe('formatHourLabel', () => {
  it('returns hour and AM/PM only', () => {
    const result = formatHourLabel(new Date('2025-02-25T17:00:00Z'));
    expect(result).toMatch(/^\d{1,2} (AM|PM)$/);
  });

  it('accepts an ISO string', () => {
    const result = formatHourLabel('2025-02-25T09:00:00Z');
    expect(result).toMatch(/^\d{1,2} (AM|PM)$/);
  });
});

describe('formatExpiresLabel', () => {
  it('starts with "Until " followed by a time', () => {
    const result = formatExpiresLabel('2025-02-25T18:15:00Z');
    expect(result).toMatch(/^Until \d{1,2}:\d{2} (AM|PM)$/);
  });
});
