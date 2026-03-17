/**
 * InstallBanner — persuasive, non-intrusive PWA install prompt.
 * 
 * Shows a floating banner with app benefits when the browser's
 * beforeinstallprompt event fires. Dismissible per session.
 */

import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Zap, WifiOff, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTranslation } from '../i18n';

export default function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {canInstall && (
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
              onClick={install}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-xl shadow-md shadow-[#2563EB]/25 transition-colors duration-75 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              {t('install.cta')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
