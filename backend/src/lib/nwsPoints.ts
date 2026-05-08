import { z } from 'zod';
import { config } from './config.js';
import { UpstreamError } from './errors.js';

const PointsResponse = z.object({
  properties: z.object({
    cwa: z.string(),
    gridId: z.string(),
    gridX: z.number().int(),
    gridY: z.number().int(),
    forecastZone: z.url(),
    county: z.url(),
    fireWeatherZone: z.url(),
    timeZone: z.string(),
    radarStation: z.string().optional(),
    relativeLocation: z.object({
      properties: z.object({
        state: z.string().length(2),
      }),
    }),
  }),
});

export interface ResolvedPoint {
  state: string;
  county_zone: string;
  forecast_zone: string;
  fire_weather_zone: string;
  cwa: string;
  grid_id: string;
  grid_x: number;
  grid_y: number;
  radar_station?: string;
  time_zone: string;
}

const tail = (url: string): string => url.split('/').pop() ?? '';

export async function resolvePoint(lat: number, lon: number): Promise<ResolvedPoint> {
  const url = `https://api.weather.gov/points/${lat},${lon}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': config.NWS_USER_AGENT, Accept: 'application/geo+json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new UpstreamError('nws_points_error', 502, `NWS /points: ${res.status}`);
  }
  const { properties: p } = PointsResponse.parse(await res.json());

  return {
    state: p.relativeLocation.properties.state,
    county_zone: tail(p.county),
    forecast_zone: tail(p.forecastZone),
    fire_weather_zone: tail(p.fireWeatherZone),
    cwa: p.cwa,
    grid_id: p.gridId,
    grid_x: p.gridX,
    grid_y: p.gridY,
    radar_station: p.radarStation,
    time_zone: p.timeZone,
  };
}
