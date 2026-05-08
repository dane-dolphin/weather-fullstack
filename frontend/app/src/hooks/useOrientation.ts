import { useEffect, useState } from 'react';

function getMediaOrientation(): 'landscape' | 'portrait' {
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

export function useOrientation(
  urlOverride?: 'landscape' | 'portrait',
): 'landscape' | 'portrait' {
  const [mediaOrientation, setMediaOrientation] = useState<'landscape' | 'portrait'>(
    getMediaOrientation,
  );

  const resolved = urlOverride ?? mediaOrientation;

  // Keep <html data-orientation> in sync with the resolved value.
  useEffect(() => {
    document.documentElement.dataset.orientation = resolved;
  }, [resolved]);

  // Subscribe to matchMedia only when there is no URL override.
  useEffect(() => {
    if (urlOverride) return;

    const mql = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => {
      setMediaOrientation(e.matches ? 'portrait' : 'landscape');
    };

    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
    };
  }, [urlOverride]);

  return resolved;
}
