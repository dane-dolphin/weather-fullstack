import { describe, test, expect, jest, beforeAll, afterEach } from '@jest/globals';
import type { ResolvedPoint } from '../../lib/nwsPoints.js';

const MOCK_NWS_RESPONSE = {
  properties: {
    cwa: 'OKX',
    gridId: 'OKX',
    gridX: 32,
    gridY: 34,
    forecastZone: 'https://api.weather.gov/zones/forecast/NYZ072',
    county: 'https://api.weather.gov/zones/county/NYC001',
    fireWeatherZone: 'https://api.weather.gov/zones/fire/NYZ072',
    timeZone: 'America/New_York',
    radarStation: 'KOKX',
    relativeLocation: {
      properties: { state: 'NY' },
    },
  },
};

const EXPECTED_POINT: ResolvedPoint = {
  state: 'NY',
  county_zone: 'NYC001',
  forecast_zone: 'NYZ072',
  fire_weather_zone: 'NYZ072',
  cwa: 'OKX',
  grid_id: 'OKX',
  grid_x: 32,
  grid_y: 34,
  radar_station: 'KOKX',
  time_zone: 'America/New_York',
};

const mockFetch = jest.fn<typeof fetch>();

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: { NWS_USER_AGENT: 'test-agent (test@example.com)' },
}));

let resolvePoint: (lat: number, lon: number) => Promise<ResolvedPoint>;

beforeAll(async () => {
  global.fetch = mockFetch;
  ({ resolvePoint } = await import('../../lib/nwsPoints.js'));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('resolvePoint', () => {
  test('maps NWS /points response to ResolvedPoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    } as Response);

    const result = await resolvePoint(40.71, -74.01);

    expect(result).toEqual(EXPECTED_POINT);
  });

  test('calls the correct NWS URL with User-Agent header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_NWS_RESPONSE),
    } as Response);

    await resolvePoint(40.71, -74.01);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.weather.gov/points/40.71,-74.01',
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'test-agent (test@example.com)' }),
      }),
    );
  });

  test('throws UpstreamError on non-2xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(resolvePoint(40.71, -74.01)).rejects.toMatchObject({
      code: 'nws_points_error',
      status: 502,
    });
  });

  test('throws on schema mismatch (missing required fields)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ properties: {} }),
    } as Response);

    await expect(resolvePoint(40.71, -74.01)).rejects.toThrow();
  });

  test('works without optional radarStation field', async () => {
    const responseWithoutRadar = {
      properties: {
        ...MOCK_NWS_RESPONSE.properties,
        radarStation: undefined,
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithoutRadar),
    } as Response);

    const result = await resolvePoint(40.71, -74.01);

    expect(result.radar_station).toBeUndefined();
    expect(result.state).toBe('NY');
  });
});
