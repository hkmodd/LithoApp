/**
 * useInstallPrompt — universal PWA install prompt hook.
 *
 * Works across all platforms:
 * - Chromium (Chrome/Edge/Opera): captures `beforeinstallprompt` for native prompt
 * - iOS Safari: detects platform and shows manual "Add to Home" instructions
 * - Other browsers: generic install guidance
 *
 * The banner shows when:
 * 1. App is NOT running in standalone mode (not already installed)
 * 2. User hasn't dismissed it (stored in localStorage with 7-day expiry)
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'chromium' | 'ios' | 'android-other' | 'desktop-other' | null;

const DISMISS_KEY = 'lithoapp-install-dismissed';
const DISMISS_DAYS = 7; // Re-show after 7 days

function getDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const expiry = parseInt(val, 10);
    if (Date.now() > expiry) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    const expiry = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(expiry));
  } catch { /* noop */ }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true // iOS Safari
  );
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent;

  // iOS detection (iPhone, iPad, iPod)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';

  // Android detection
  const isAndroid = /Android/i.test(ua);

  // Chromium detection (supports beforeinstallprompt)
  const isChromium =
    'BeforeInstallPromptEvent' in window ||
    /Chrome|CriOS|Edg|OPR/i.test(ua);

  if (isChromium) return 'chromium';
  if (isAndroid) return 'android-other'; // Firefox on Android, etc.

  return 'desktop-other';
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissedState] = useState(getDismissed);
  const [platform, setPlatform] = useState<InstallPlatform>(null);

  useEffect(() => {
    // Already installed as standalone
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setPlatform(detectPlatform());

    // Listen for Chromium's beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('chromium'); // confirm Chromium support
    };

    const appInstalledHandler = () => {
      setInstalled(true);
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
    if (outcome === 'accepted') setInstalled(true);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissedState(true);
    setDismissed();
  }, []);

  // Show banner unless installed or dismissed
  // For Chromium: always show (with or without deferredPrompt)
  // For iOS/other: show instructions
  const showBanner = !installed && !dismissed && platform !== null;

  return {
    /** Whether to show the install banner */
    showBanner,
    /** Detected platform for conditional UI */
    platform,
    /** Whether the native Chromium prompt is available */
    hasNativePrompt: !!deferredPrompt,
    /** Whether the app is already installed */
    isInstalled: installed,
    /** Trigger the native install prompt (Chromium only) */
    install,
    /** Dismiss the banner for 7 days */
    dismiss,
  };
}
