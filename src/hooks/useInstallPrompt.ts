/**
 * useInstallPrompt — PWA install prompt hook.
 *
 * Strategy:
 * - Chromium browsers: captures `beforeinstallprompt` for a custom banner.
 *   Does NOT call e.preventDefault() so Chrome's native mini-infobar still shows.
 * - iOS Safari: detects Safari on iOS and shows manual "Add to Home" instructions.
 * - Already standalone: hides everything.
 *
 * Dismiss is stored in localStorage with 7-day expiry.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'chromium' | 'ios' | null;

const DISMISS_KEY = 'lithoapp-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const expiry = parseInt(val, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function saveDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
  } catch { /* noop */ }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari standalone
    ('standalone' in navigator && (navigator as any).standalone === true)
  );
}

function detectIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPhone/iPad/iPod  — Safari only (not Chrome on iOS, which supports PWA differently)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Exclude Chrome/Firefox/etc on iOS — they use webkit but have their own UA strings
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isSafari;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissedState] = useState(isDismissed);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Detect iOS Safari for manual instructions
    setIsIOSSafari(detectIOSSafari());

    // Capture beforeinstallprompt (Chromium only).
    // IMPORTANT: we do NOT call e.preventDefault() — this allows Chrome's
    // native mini-infobar to appear on mobile, which is the standard UX.
    // We still capture the event to offer our own custom banner as well.
    const handler = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setDeferredPrompt(evt);
    };

    const appInstalledHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = promptRef.current;
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      promptRef.current = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') setInstalled(true);
      return outcome === 'accepted';
    } catch {
      return false;
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissedState(true);
    saveDismiss();
  }, []);

  // Determine what to show
  const canShowChromium = !!deferredPrompt && !installed && !dismissed;
  const canShowIOS = isIOSSafari && !installed && !dismissed;

  return {
    /** Show native (Chromium) install banner */
    canInstall: canShowChromium,
    /** Show iOS Safari manual instructions */
    showIOSInstructions: canShowIOS,
    /** Platform for conditional UI */
    platform: (canShowChromium ? 'chromium' : canShowIOS ? 'ios' : null) as InstallPlatform,
    /** Whether the app is already installed */
    isInstalled: installed,
    /** Trigger the native install prompt (Chromium only) */
    install,
    /** Dismiss the banner for 7 days */
    dismiss,
  };
}
