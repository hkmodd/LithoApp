import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Tiny version badge — shows "v1.0.0" with optional build-date tooltip.
 * Click to toggle timestamp. Non-invasive, semi-transparent.
 */
export default function VersionBadge() {
  const [showDate, setShowDate] = useState(false);

  const buildDate = useMemo(() => {
    try {
      const d = new Date(__BUILD_TIMESTAMP__);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return __BUILD_TIMESTAMP__;
    }
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setShowDate(v => !v)}
        className="text-[9px] font-mono text-white/25 hover:text-white/50
                   transition-colors duration-200 tracking-wider select-none"
        aria-label={`Version ${__APP_VERSION__}`}
      >
        v{__APP_VERSION__}
      </button>

      <AnimatePresence>
        {showDate && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2
                       bg-black/80 backdrop-blur-xl border border-white/10
                       rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap z-50"
          >
            <span className="text-[10px] font-mono text-gray-400">
              Build: {buildDate}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
