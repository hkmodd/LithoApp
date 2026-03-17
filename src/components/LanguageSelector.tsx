import { memo, useState, useRef } from 'react';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { LOCALE_LABELS, SUPPORTED_LOCALES, useTranslation } from '../i18n';
import type { SupportedLocale } from '../i18n';

export default memo(function LanguageSelector() {
  const { language, setLanguage } = useAppStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 transition-colors duration-75"
        title={t('lang.label')}
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-medium">{LOCALE_LABELS[language as SupportedLocale]?.split(' ')[0] ?? '🌐'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="absolute top-full right-0 mt-2 z-50 w-48 max-h-64 overflow-y-auto bg-[#111]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl custom-scrollbar"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => { setLanguage(loc); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                    loc === language
                      ? 'bg-[#2563EB]/15 text-white font-medium'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
