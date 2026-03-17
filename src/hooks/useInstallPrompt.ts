/**
 * useInstallPrompt — captures the browser's `beforeinstallprompt` event
 * and provides a method to trigger native install.
 * 
 * Only works in browsers that support the Web App Manifest (Chrome, Edge, Opera).
 * Returns null prompt in Firefox/Safari where PWA install is handled differently.
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('lithoapp-install-dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Check if already installed as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem('lithoapp-install-dismissed', '1');
    } catch { /* noop */ }
  }, []);

  return {
    /** Whether the install prompt is available */
    canInstall: !!deferredPrompt && !isInstalled && !dismissed,
    /** Whether the app is already installed */
    isInstalled,
    /** Trigger the native install prompt */
    install,
    /** Dismiss the banner for this session */
    dismiss,
  };
}
