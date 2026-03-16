import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Boot splash screen with animated logo and WASM loading indicator.
 * Auto-dismisses after minimum 1.5s (or when `ready` becomes true).
 */
interface BootSplashProps {
  /** Set to true when application is ready (WASM loaded, etc.) */
  ready: boolean;
}

export default function BootSplash({ ready }: BootSplashProps) {
  const [show, setShow] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minTimePassed) {
      // Give a small delay for exit animation
      const timer = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(timer);
    }
  }, [ready, minTimePassed]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center"
        >
          {/* Logo Mark */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative mb-8"
          >
            {/* Glow ring */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(37, 99, 235, 0)',
                  '0 0 0 20px rgba(37, 99, 235, 0.15)',
                  '0 0 0 40px rgba(37, 99, 235, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 bg-[#2563EB] rounded-3xl flex items-center justify-center"
            >
              {/* Crystal/prism icon (SVG inline) */}
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Simplified lithophane/prism shape */}
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
                <path d="M12 22V12" opacity="0.6" />
                <path d="M22 7L12 12 2 7" opacity="0.6" />
                <path d="M12 2L12 12" opacity="0.3" />
              </svg>
            </motion.div>
          </motion.div>

          {/* App Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">LithoApp</h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">
              Neural Surface Generator
            </p>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 bg-[#2563EB] rounded-full"
                />
              ))}
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600">
              Initializing
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
