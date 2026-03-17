/**
 * useInstallPrompt — PWA install prompt hook.
 *
 * Shows the install banner on ALL mobile browsers (not standalone).
 * - If `beforeinstallprompt` fired → native install prompt available.
 * - If iOS Safari → "Share → Add to Home" instructions.
 * - If Android/other mobile without prompt → "Menu → Add to Home" instructions.
 * - Desktop: only shows when `beforeinstallprompt` fires.
 *
 * Dismiss stored in localStorage with 7-day expiry.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'chromium' | 'ios' | 'android' | null;

const DISMISS_KEY = 'lithoapp-install-dismissed';
const DISMISS_DAYS = 7;

/* ---- helpers ---- */

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
    ('standalone' in navigator && (navigator as any).standalone === true)
  );
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* ---- hook ---- */

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissedState] = useState(isDismissed);
  const [mobile, setMobile] = useState(false);
  const [ios, setIOS] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as PWA — hide everything
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setMobile(isMobile());
    setIOS(isIOSDevice());

    // Capture beforeinstallprompt (Chromium). Do NOT call preventDefault()
    // so Chrome's native mini-infobar + 3-dot menu install still works.
    const onPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setDeferredPrompt(evt);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      promptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
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

  // Should we show the banner?
  const hasPrompt = !!deferredPrompt;

  // On mobile: ALWAYS show (unless installed/dismissed)
  // On desktop: only when beforeinstallprompt fired
  const showBanner = !installed && !dismissed && (mobile || hasPrompt);

  // Determine platform for UI
  let platform: InstallPlatform = null;
  if (showBanner) {
    if (hasPrompt) {
      platform = 'chromium'; // native prompt available
    } else if (ios) {
      platform = 'ios';      // iOS manual instructions
    } else if (mobile) {
      platform = 'android';  // Android manual instructions
    }
  }

  return {
    showBanner,
    platform,
    /** Can we trigger a native install prompt? */
    hasNativePrompt: hasPrompt,
    isInstalled: installed,
    install,
    dismiss,
  };
}
