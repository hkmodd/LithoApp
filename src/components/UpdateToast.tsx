import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useTranslation } from '../i18n';

/**
 * Non-invasive toast that appears when a new service worker is detected.
 * Shows a "New version available" message with an update button.
 */
export default function UpdateToast() {
  const { updateReady, applyUpdate, dismissUpdate } = useUpdateCheck();
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
                     bg-black/70 backdrop-blur-2xl border border-white/10
                     rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/50
                     flex items-center gap-4 max-w-[90vw]"
        >
          {/* Animated refresh icon */}
          <div className="bg-[#2563EB]/20 p-2 rounded-xl flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-[#2563EB] animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          {/* Text */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {t('update.available')}
            </span>
            <span className="text-[10px] text-gray-400 truncate">
              {t('update.hint')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={applyUpdate}
              className="bg-[#2563EB] hover:bg-[#2563EB]/80 text-white text-xs font-semibold
                         px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {t('update.action')}
            </button>
            <button
              onClick={dismissUpdate}
              className="text-gray-500 hover:text-gray-300 p-1 rounded-lg
                         hover:bg-white/5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
