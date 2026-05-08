import { lazy, Suspense, useEffect } from 'react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useOrientation } from '@/hooks/useOrientation';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useWeather } from '@/api/useWeather';
import { mapToViewModel } from '@/domain/viewModel';
import { WeatherScene } from '@/components/scenes/WeatherScene';
import { SceneClear } from '@/components/scenes/SceneClear';
import { WeatherCard } from '@/components/WeatherCard/WeatherCard';
import { LoadingGlyph } from '@/components/LoadingGlyph';
import styles from './App.module.css';

// Loaded lazily so the dev fixtures are excluded from the production bundle.
// The outer condition is stripped to `null` by Vite when building for prod.
const PreviewApp = import.meta.env.DEV
  ? lazy(() => import('./dev/PreviewRoutes').then((m) => ({ default: m.PreviewApp })))
  : null;

export function App() {
  const urlParams = useUrlParams();
  useOrientation(urlParams.orientation);
  useViewportHeight();

  // Preview mode: DEV only. Renders a fixture instead of hitting the weather API.
  if (import.meta.env.DEV && PreviewApp !== null && urlParams.preview !== undefined) {
    return (
      <Suspense fallback={<SceneFallback />}>
        <PreviewApp preview={urlParams.preview} />
      </Suspense>
    );
  }

  return <WeatherMain lat={urlParams.lat} lon={urlParams.lon} hideAlerts={urlParams.hideAlerts} />;
}

// Sub-component so its hooks are not conditionally called from App.
function WeatherMain({ lat, lon, hideAlerts }: { lat: number; lon: number; hideAlerts: boolean }) {
  const { state, data, error } = useWeather(lat, lon);

  useEffect(() => {
    if (state !== 'ok' || !data?.weather) return;
    document.documentElement.dataset.theme = (data.weather.isDay ?? true) ? 'day' : 'night';
  }, [state, data]);

  // loading / cold-start — show spinner over clear-day scene
  if (state === 'loading' || state === 'cold-start') {
    return (
      <div className={styles.root}>
        <SceneClear isDay />
        <div className={styles.loadingOverlay}>
          <LoadingGlyph />
          <p className={styles.loadingText}>Fetching weather…</p>
        </div>
      </div>
    );
  }

  // error without any prior data — show error pill only
  if (state === 'error' && (data == null || data.weather == null)) {
    return (
      <div className={styles.root}>
        <SceneClear isDay />
        <div className={styles.errorPill}>{error?.message ?? 'Unable to load weather'}</div>
      </div>
    );
  }

  // ok (or error with stale data preserved by caller)
  const raw = mapToViewModel(data!);
  const viewModel = hideAlerts ? { ...raw, alert: null } : raw;
  const weatherCode = data!.weather?.weatherCode ?? 0;

  return (
    <div className={styles.root}>
      {state === 'error' && (
        <div className={styles.errorPill}>{error?.message ?? 'Unable to load weather'}</div>
      )}
      <WeatherScene
        category={viewModel.category}
        isDay={viewModel.isDay}
        weatherCode={weatherCode}
      />
      <WeatherCard data={viewModel} />
    </div>
  );
}

function SceneFallback() {
  return (
    <div className={styles.root}>
      <SceneClear isDay />
    </div>
  );
}
