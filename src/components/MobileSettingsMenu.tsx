import { useState, useRef, useCallback } from 'react';
import { Box, Save, Download, FolderOpen, Clock, Globe, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useProjectStore } from '../store/useProjectStore';
import { useTranslation } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '../i18n';
import type { SupportedLocale } from '../i18n';

interface MobileSettingsMenuProps {
  onOpenHistory: () => void;
}

export default function MobileSettingsMenu({ onOpenHistory }: MobileSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t } = useTranslation();
  const { saveToLocal, exportToFile, importFromFile } = useProjectStore();
  const { language, setLanguage } = useAppStore();
  const importRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setLangOpen(false); }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await importFromFile(file);
    if (importRef.current) importRef.current.value = '';
    close();
  }, [importFromFile, close]);

  return (
    <>
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Trigger: LithoApp logo badge */}
      <div className="absolute left-2 z-20" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <button
          onClick={() => { setOpen(o => !o); setLangOpen(false); }}
          className={cn(
            'bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-1.5 shadow-xl transition-colors',
            open ? 'border-[#2563EB]/50 bg-[#2563EB]/10' : 'active:bg-white/10'
          )}
          aria-label={t('menu.settings')}
          aria-expanded={open}
        >
          <div className="bg-[#2563EB] p-1 rounded-lg">
            <Box className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] font-semibold tracking-tight">LithoApp</span>
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-30" onClick={close} />

              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-0 top-full mt-1.5 z-40 w-56 bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Save */}
                <MenuItem
                  icon={<Save className="w-4 h-4" />}
                  label={t('menu.save')}
                  onClick={() => { saveToLocal(); close(); }}
                />

                {/* Export */}
                <MenuItem
                  icon={<Download className="w-4 h-4" />}
                  label={t('menu.export')}
                  onClick={() => { exportToFile(); close(); }}
                />

                {/* Import */}
                <MenuItem
                  icon={<FolderOpen className="w-4 h-4" />}
                  label={t('menu.import')}
                  onClick={() => { importRef.current?.click(); close(); }}
                />

                {/* Divider */}
                <div className="h-px bg-white/5 mx-3" />

                {/* History */}
                <MenuItem
                  icon={<Clock className="w-4 h-4" />}
                  label={t('menu.history')}
                  onClick={() => { onOpenHistory(); close(); }}
                />

                {/* Language sub-menu */}
                <div className="relative">
                  <button
                    onClick={() => setLangOpen(o => !o)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 text-left">{LOCALE_LABELS[language as SupportedLocale]?.split(' ')[0] ?? '🌐'}</span>
                    <ChevronRight className={cn('w-3.5 h-3.5 text-gray-600 transition-transform', langOpen && 'rotate-90')} />
                  </button>

                  <AnimatePresence>
                    {langOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="overflow-hidden"
                      >
                        <div className="max-h-48 overflow-y-auto custom-scrollbar border-t border-white/5">
                          {SUPPORTED_LOCALES.map(loc => (
                            <button
                              key={loc}
                              onClick={() => { setLanguage(loc); close(); }}
                              className={cn(
                                'w-full text-left pl-11 pr-4 py-2 text-xs transition-colors',
                                loc === language
                                  ? 'bg-[#2563EB]/15 text-white font-medium'
                                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              )}
                            >
                              {LOCALE_LABELS[loc]}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider + Version */}
                <div className="h-px bg-white/5 mx-3" />
                <div className="px-4 py-2 text-center">
                  <span className="text-[9px] font-mono text-white/20 tracking-wider">
                    v{__APP_VERSION__}
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/** Reusable menu item */
function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors"
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
