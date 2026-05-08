import { useEffect, useRef, useState } from 'react';
import { getWeather } from './client';
import type { ApiSuccess } from './types';

type WeatherState = 'loading' | 'cold-start' | 'ok' | 'error';

export type UseWeatherResult = {
  state: WeatherState;
  data?: ApiSuccess;
  error?: Error;
};

type InternalResult = {
  reqLat: number;
  reqLon: number;
  state: WeatherState;
  data?: ApiSuccess;
  error?: Error;
};

const POLL_NORMAL = 300_000;
const POLL_COLD_START = 5_000;
const COLD_START_LIMIT = 30_000;

export function useWeather(lat: number, lon: number): UseWeatherResult {
  const [internal, setInternal] = useState<InternalResult>(() => ({
    reqLat: lat,
    reqLon: lon,
    state: 'loading',
  }));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let coldStartBegan: number | null = null;

    function clearTimer() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function scheduleNext(delay: number) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        void fetchAndSchedule();
      }, delay);
    }

    async function fetchAndSchedule() {
      if (cancelled || document.hidden) return;

      try {
        const data = await getWeather(lat, lon);
        if (cancelled) return;

        if (data.weather !== null) {
          coldStartBegan = null;
          setInternal({ reqLat: lat, reqLon: lon, state: 'ok', data });
          scheduleNext(POLL_NORMAL);
        } else {
          if (coldStartBegan === null) coldStartBegan = Date.now();
          const elapsed = Date.now() - coldStartBegan;
          if (elapsed >= COLD_START_LIMIT) {
            setInternal({
              reqLat: lat,
              reqLon: lon,
              state: 'error',
              error: new Error('Weather data unavailable after cold start'),
            });
          } else {
            setInternal({ reqLat: lat, reqLon: lon, state: 'cold-start', data });
            scheduleNext(POLL_COLD_START);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setInternal({
          reqLat: lat,
          reqLon: lon,
          state: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimer();
      } else {
        clearTimer();
        void fetchAndSchedule();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void fetchAndSchedule();

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lat, lon]);

  // Derive 'loading' from coord mismatch so no synchronous setState is needed in the effect body.
  const isStale = internal.reqLat !== lat || internal.reqLon !== lon;
  if (isStale) return { state: 'loading' };
  return { state: internal.state, data: internal.data, error: internal.error };
}
