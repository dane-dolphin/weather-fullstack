import { describe, it, expect } from 'vitest';
import { pickPrimaryAlert } from './alerts';
import type { ApiSuccess, NwsAlert, Earthquake } from '@/api/types';

const BASE_API: ApiSuccess = {
  lat: 37.32,
  lon: -122.03,
  as_of: '2025-02-25T16:00:00Z',
  location: {
    state: 'CA',
    county_zone: 'CAC085',
    forecast_zone: 'CAZ513',
    time_zone: 'America/Los_Angeles',
  },
  weather: null,
  alerts: [],
  earthquakes: [],
};

function makeAlert(
  severity: NwsAlert['severity'],
  event = 'Severe Thunderstorm Warning',
  headline: string | null = `${event} in effect`,
  description: string | null = `${event} description`,
): NwsAlert {
  return {
    alert_id: 'a1',
    state: 'CA',
    event,
    severity,
    headline,
    description,
    affected_zones: [],
    is_state_wide: false,
    effective: '2025-02-25T14:00:00Z',
    expires: '2025-02-25T20:00:00Z',
    source: 'NWS',
  };
}

function makeQuake(magnitude: number, place = 'Near Cupertino, CA'): Earthquake {
  return {
    quake_id: 'q1',
    magnitude,
    place,
    time: 1740499380000,
    lat: 37.32,
    lon: -122.03,
  };
}

describe('pickPrimaryAlert', () => {
  it('returns null when alerts and earthquakes are both empty', () => {
    expect(pickPrimaryAlert(BASE_API)).toBeNull();
  });

  it('maps Severe Thunderstorm Warning to kind "severe"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Severe Thunderstorm Warning')] });
    expect(result?.kind).toBe('severe');
  });

  it('maps Tornado Warning to kind "tornado"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Extreme', 'Tornado Warning')] });
    expect(result?.kind).toBe('tornado');
  });

  it('maps Tornado Watch to kind "tornado"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Tornado Watch')] });
    expect(result?.kind).toBe('tornado');
  });

  it('maps Flood Warning to kind "flood"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Flood Warning')] });
    expect(result?.kind).toBe('flood');
  });

  it('maps Flash Flood Warning to kind "flood"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Flash Flood Warning')] });
    expect(result?.kind).toBe('flood');
  });

  it('maps Winter Storm Warning to kind "winter"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Winter Storm Warning')] });
    expect(result?.kind).toBe('winter');
  });

  it('maps Excessive Heat Warning to kind "heat"', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Extreme', 'Excessive Heat Warning')] });
    expect(result?.kind).toBe('heat');
  });

  it('falls back to kind "warning" for unmapped event', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Minor', 'Air Quality Alert')] });
    expect(result?.kind).toBe('warning');
  });

  it('selects the highest-severity alert when multiple exist', () => {
    const alerts = [
      makeAlert('Minor', 'Air Quality Alert'),
      makeAlert('Severe', 'Severe Thunderstorm Warning'),
      makeAlert('Moderate', 'Flood Warning'),
    ];
    const result = pickPrimaryAlert({ ...BASE_API, alerts });
    expect(result?.kind).toBe('severe');
  });

  it('breaks severity ties deterministically (first in sorted order wins)', () => {
    const alerts = [
      makeAlert('Extreme', 'Tornado Warning'),
      makeAlert('Extreme', 'Excessive Heat Warning'),
    ];
    const result = pickPrimaryAlert({ ...BASE_API, alerts });
    expect(result?.kind).toBe('tornado');
  });

  it('prefers NWS alerts over earthquakes when both present', () => {
    const result = pickPrimaryAlert({
      ...BASE_API,
      alerts: [makeAlert('Moderate')],
      earthquakes: [makeQuake(6.0)],
    });
    expect(result?.source).toBe('NWS');
  });

  it('returns earthquake banner when alerts list is empty', () => {
    const result = pickPrimaryAlert({ ...BASE_API, earthquakes: [makeQuake(4.2)] });
    expect(result?.kind).toBe('earthquake');
    expect(result?.tag).toBe('EARTHQUAKE');
    expect(result?.source).toBe('USGS');
    expect(result?.title).toContain('4.2');
    expect(result?.message).toContain('4.2');
  });

  it('picks the largest earthquake when multiple exist', () => {
    const result = pickPrimaryAlert({
      ...BASE_API,
      earthquakes: [makeQuake(3.1), makeQuake(5.8), makeQuake(2.3)],
    });
    expect(result?.title).toContain('5.8');
  });

  it('sets tag to the uppercased event name', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe', 'Severe Thunderstorm Warning')] });
    expect(result?.tag).toBe('SEVERE THUNDERSTORM WARNING');
  });

  it('sets source to "NWS" for alert banners', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe')] });
    expect(result?.source).toBe('NWS');
  });

  it('uses headline as title when available', () => {
    const result = pickPrimaryAlert({
      ...BASE_API,
      alerts: [makeAlert('Severe', 'Severe Thunderstorm Warning', 'Custom headline')],
    });
    expect(result?.title).toBe('Custom headline');
  });

  it('falls back to event name when headline is null', () => {
    const result = pickPrimaryAlert({
      ...BASE_API,
      alerts: [makeAlert('Severe', 'Severe Thunderstorm Warning', null, null)],
    });
    expect(result?.title).toBe('Severe Thunderstorm Warning');
    expect(result?.message).toBe('');
  });

  it('includes a meta field with expiry time for NWS alerts', () => {
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [makeAlert('Severe')] });
    expect(result?.meta).toMatch(/^Until \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('includes a meta field with event time for earthquakes', () => {
    const result = pickPrimaryAlert({ ...BASE_API, earthquakes: [makeQuake(4.5)] });
    expect(result?.meta).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it('treats unrecognized severity as rank 0 (loses to any known severity)', () => {
    const unknown = {
      ...makeAlert('Minor'),
      severity: 'Catastrophic' as NwsAlert['severity'],
      event: 'Air Quality Alert',
    };
    const extreme = makeAlert('Extreme', 'Tornado Warning');
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [unknown, extreme] });
    expect(result?.kind).toBe('tornado');
  });

  it('handles two unrecognized severities (both sides of comparator are unknown)', () => {
    const unk1 = {
      ...makeAlert('Minor'),
      severity: 'Bogus1' as NwsAlert['severity'],
      event: 'Event A',
      headline: 'Event A headline',
    };
    const unk2 = {
      ...makeAlert('Minor'),
      severity: 'Bogus2' as NwsAlert['severity'],
      event: 'Event B',
      headline: 'Event B headline',
    };
    const result = pickPrimaryAlert({ ...BASE_API, alerts: [unk1, unk2] });
    expect(result).not.toBeNull();
  });
});
