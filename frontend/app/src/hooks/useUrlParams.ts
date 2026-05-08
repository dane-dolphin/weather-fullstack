import { useMemo } from 'react';

type UrlParams = {
  lat: number;
  lon: number;
  orientation: 'landscape' | 'portrait' | undefined;
  preview: string | undefined;
  hideAlerts: boolean;
};

const DEFAULT_LAT = 37.322998;
const DEFAULT_LON = -122.032181;

export function useUrlParams(): UrlParams {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    let lat = DEFAULT_LAT;
    let lon = DEFAULT_LON;
    let orientation: 'landscape' | 'portrait' | undefined = undefined;

    const latRaw = params.get('lat');
    if (latRaw !== null) {
      const parsed = parseFloat(latRaw);
      if (!Number.isNaN(parsed) && parsed >= -90 && parsed <= 90) {
        lat = parsed;
      } else if (import.meta.env.DEV) {
        console.warn(`[useUrlParams] Invalid lat="${latRaw}", using default ${DEFAULT_LAT}`);
      }
    }

    const lonRaw = params.get('lon');
    if (lonRaw !== null) {
      const parsed = parseFloat(lonRaw);
      if (!Number.isNaN(parsed) && parsed >= -180 && parsed <= 180) {
        lon = parsed;
      } else if (import.meta.env.DEV) {
        console.warn(`[useUrlParams] Invalid lon="${lonRaw}", using default ${DEFAULT_LON}`);
      }
    }

    const orientationRaw = params.get('orientation');
    if (orientationRaw !== null) {
      if (orientationRaw === 'landscape' || orientationRaw === 'portrait') {
        orientation = orientationRaw;
      } else if (import.meta.env.DEV) {
        console.warn(
          `[useUrlParams] Invalid orientation="${orientationRaw}", falling back to media query`,
        );
      }
    }

    const preview = params.get('preview') ?? undefined;

    const alertsRaw = params.get('alerts');
    const hideAlerts = alertsRaw === '0' || alertsRaw === 'false';

    return { lat, lon, orientation, preview, hideAlerts };
  }, []);
}
