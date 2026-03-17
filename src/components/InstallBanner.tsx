/**
 * InstallBanner — universal PWA install prompt.
 *
 * Platform-aware:
 * - Chromium: native install prompt via beforeinstallprompt
 * - iOS Safari: shows "Share → Add to Home Screen" instructions
 * - Android (non-Chrome): shows "Menu → Add to Home" instructions
 * - Desktop other: shows generic guidance
 *
 * Dismissible with 7-day localStorage expiry.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Zap, WifiOff, Smartphone, Share, MoreVertical, PlusSquare } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTranslation } from '../i18n';

export default function InstallBanner() {
  const { showBanner, platform, hasNativePrompt, install, dismiss } = useInstallPrompt();
  const { t } = useTranslation();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!showBanner) return null;

  /** CTA click handler — native prompt or manual instructions */
  const handleInstall = async () => {
    if (hasNativePrompt) {
      const accepted = await install();
      if (accepted) return; // installed, banner will auto-hide
    }
    // No native prompt available — show platform instructions
    setShowInstructions(true);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-gradient-to-br from-[#0f172a]/95 to-[#1e1b4b]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl shadow-black/40">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Instruction overlay (iOS / fallback) */}
            {showInstructions ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  {t('install.howto')}
                </h3>
                {platform === 'ios' ? (
                  <div className="space-y-2">
                    <Step icon={<Share className="w-4 h-4 text-blue-400" />} text={t('install.ios.step1')} />
                    <Step icon={<PlusSquare className="w-4 h-4 text-blue-400" />} text={t('install.ios.step2')} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Step icon={<MoreVertical className="w-4 h-4 text-blue-400" />} text={t('install.android.step1')} />
                    <Step icon={<PlusSquare className="w-4 h-4 text-blue-400" />} text={t('install.android.step2')} />
                  </div>
                )}
                <button
                  onClick={dismiss}
                  className="w-full py-2 text-gray-400 text-xs hover:text-gray-300 transition-colors"
                >
                  {t('install.gotit')}
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-[#2563EB] p-2 rounded-xl shadow-lg shadow-[#2563EB]/30 flex-shrink-0">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight">
                      {t('install.title')}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed pr-6">
                      {t('install.subtitle')}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="flex items-center gap-4 mb-3 px-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {t('install.fast')}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <WifiOff className="w-3 h-3 text-emerald-400" />
                    {t('install.offline')}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Smartphone className="w-3 h-3 text-purple-400" />
                    {t('install.native')}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleInstall}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-xl shadow-md shadow-[#2563EB]/25 transition-colors duration-75 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  {t('install.cta')}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small instruction step row */
function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2">
      {icon}
      <span className="text-xs text-gray-300">{text}</span>
    </div>
  );
}
