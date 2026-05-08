import { useEffect } from 'react';

export function useViewportHeight(): void {
  useEffect(() => {
    let rafId: number | null = null;

    function update() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
      });
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
}
