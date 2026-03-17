import { useState, useEffect, useCallback } from 'react';

/**
 * Detects when a new service worker is available and lets the app
 * prompt the user before activating it.
 *
 * Triggers:
 *  - `updatefound` event on the SW registration
 *  - periodic polling (every 30 s when online)
 *  - `visibilitychange` → re-check when user switches back to the tab/app
 *  - `online` event → re-check when network comes back
 *
 * Offline-safe: skips the check when navigator.onLine is false.
 */
export function useUpdateCheck() {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let reg: ServiceWorkerRegistration | undefined;

    const markReady = (sw: ServiceWorker) => {
      setWaitingSW(sw);
      setUpdateReady(true);
    };

    /** Safe update check — only when online */
    const tryUpdate = () => {
      if (reg && navigator.onLine) {
        reg.update().catch(() => {/* offline / network error — ignore */});
      }
    };

    const onUpdateFound = () => {
      const newSW = reg?.installing;
      if (!newSW) return;

      newSW.addEventListener('statechange', () => {
        // New SW is installed and there's already a controller (i.e. not first install)
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          markReady(newSW);
        }
      });
    };

    /** When tab becomes visible again (mobile app-switch / tab switch) */
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tryUpdate();
      }
    };

    /** When device comes back online */
    const onOnline = () => {
      tryUpdate();
    };

    const init = async () => {
      try {
        reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        // If there's already a waiting worker from a previous visit
        if (reg.waiting && navigator.serviceWorker.controller) {
          markReady(reg.waiting);
          return;
        }

        // Listen for future updates
        reg.addEventListener('updatefound', onUpdateFound);

        // Immediate check on mount
        tryUpdate();

        // Poll every 30 s
        interval = setInterval(tryUpdate, 30_000);

        // Re-check on visibility / online events
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('online', onOnline);
      } catch {
        // SW not supported or error — ignore
      }
    };

    init();

    // When the new SW takes over, reload to get fresh assets
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      if (interval) clearInterval(interval);
      if (reg) reg.removeEventListener('updatefound', onUpdateFound);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange listener above will reload the page
    }
  }, [waitingSW]);

  const dismissUpdate = useCallback(() => {
    setUpdateReady(false);
  }, []);

  return { updateReady, applyUpdate, dismissUpdate };
}
