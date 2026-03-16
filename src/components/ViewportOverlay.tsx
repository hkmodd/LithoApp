import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';

/**
 * Animated frosted-glass overlay shown on the 3D viewport during mesh regeneration.
 * Controls remain fully interactive underneath — only the viewport blurs.
 */
export default function ViewportOverlay() {
  const isRegenerating = useAppStore((s) => s.isRegenerating);
  const progress = useAppStore((s) => s.progress);
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isRegenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="viewport-overlay"
        >
          {/* Animated rings */}
          <div className="regen-rings">
            <div className="regen-ring regen-ring-1" />
            <div className="regen-ring regen-ring-2" />
            <div className="regen-ring regen-ring-3" />
          </div>

          {/* Center content */}
          <div className="regen-content">
            <div className="regen-spinner" />
            <span className="regen-label">
              {progress?.message || t('app.regenerating' as any) || 'Regenerating…'}
            </span>
            {progress && progress.percent > 0 && (
              <div className="regen-progress-track">
                <motion.div
                  className="regen-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
