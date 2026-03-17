import { useState, useEffect, useCallback } from 'react';

/**
 * Detects when a new service worker is available and lets the app
 * prompt the user before activating it.
 *
 * Offline-safe: skips the check when navigator.onLine is false.
 */
export function useUpdateCheck() {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const detectUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        // If there's already a waiting worker from a previous visit
        if (reg.waiting) {
          setWaitingSW(reg.waiting);
          setUpdateReady(true);
          return;
        }

        // Listen for new updates
        const onUpdateFound = () => {
          const newSW = reg.installing;
          if (!newSW) return;

          newSW.addEventListener('statechange', () => {
            // New SW is installed and there's already a controller (i.e., not first install)
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingSW(newSW);
              setUpdateReady(true);
            }
          });
        };

        reg.addEventListener('updatefound', onUpdateFound);

        // Also periodically check for updates (every 60s when online)
        const interval = setInterval(() => {
          if (navigator.onLine) {
            reg.update().catch(() => {/* offline or network error — ignore */});
          }
        }, 60_000);

        return () => {
          reg.removeEventListener('updatefound', onUpdateFound);
          clearInterval(interval);
        };
      } catch {
        // SW not supported or error — ignore
      }
    };

    detectUpdate();

    // When the new SW takes over, reload to get fresh assets
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
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
