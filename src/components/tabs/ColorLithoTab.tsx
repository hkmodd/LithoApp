import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Palette, Info, Zap, FlaskConical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import type { ColorChannel } from '../../workers/types';
import AmsConfigurator from '../AmsConfigurator';
import FilamentManager from '../FilamentManager';

/** Colour engine mode */
type EngineMode = 'quick' | 'palette';

/** UI-only channel colour palette (renamed to avoid collision with engine CHANNEL_COLORS) */
const UI_CHANNEL_COLORS: Record<ColorChannel, string> = {
  composite: '#6366f1', // indigo
  white:     '#f5f5f5', // near-white (base)
  yellow:    '#eab308', // yellow
  magenta:   '#ec4899', // pink
  cyan:      '#06b6d4', // cyan
  white_top: '#e0e0ff', // light blue-white (top diffuser)
};

const CHANNEL_KEYS: ColorChannel[] = ['composite', 'white', 'yellow', 'magenta', 'cyan', 'white_top'];

export default function ColorLithoTab() {
  // Individual selectors — no re-render on unrelated store changes (e.g. progress)
  const activeColorChannel = useAppStore(s => s.activeColorChannel);
  const setActiveColorChannel = useAppStore(s => s.setActiveColorChannel);
  const colorMeshSet = useAppStore(s => s.colorMeshSet);
  const setMode = useAppStore(s => s.setMode);
  const storeMode = useAppStore(s => s.mode);
  const { t } = useTranslation();

  // Derive engine mode from store mode (no local state)
  const engineMode = useMemo<EngineMode>(
    () => storeMode === 'palette-litho' ? 'palette' : 'quick',
    [storeMode]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          Mode toggle: Quick CMYW ↔ Palette
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          {t('palette.modeLabel')}
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/5">
          {/* Quick CMYW */}
          <button
            onClick={() => setMode('color-litho')}
            className={cn(
              "relative flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium rounded-lg transition-all duration-150",
              engineMode === 'quick'
                ? "bg-white/10 text-white shadow-md"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Zap className="w-3 h-3" />
            {t('palette.modeQuick')}
            {engineMode === 'quick' && (
              <motion.div
                layoutId="engine-mode-indicator"
                className="absolute inset-0 rounded-lg border-2 border-indigo-500/30"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          {/* Palette Mode */}
          <button
            onClick={() => setMode('palette-litho')}
            className={cn(
              "relative flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium rounded-lg transition-all duration-150",
              engineMode === 'palette'
                ? "bg-white/10 text-white shadow-md"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <FlaskConical className="w-3 h-3" />
            {t('palette.modePalette')}
            {engineMode === 'palette' && (
              <motion.div
                layoutId="engine-mode-indicator"
                className="absolute inset-0 rounded-lg border-2 border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Subtle hint */}
        <p className="text-[9px] text-gray-600 leading-relaxed px-0.5">
          {engineMode === 'quick' ? t('palette.modeQuickHint') : t('palette.modePaletteHint')}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Quick Mode: existing CMYW channel selector
         ═══════════════════════════════════════════════════════════════════ */}
      {engineMode === 'quick' && (
        <>
          {/* Info banner */}
          <div className="flex gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-indigo-300/80 leading-relaxed">
              {t('color.info')}
            </p>
          </div>

          {/* Channel selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Palette className="w-3 h-3" />
              {t('color.channel')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CHANNEL_KEYS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setActiveColorChannel(ch)}
                  className={cn(
                    "relative py-2.5 px-2 text-[10px] font-medium rounded-lg transition-all duration-100 border",
                    activeColorChannel === ch
                      ? "bg-white/10 border-white/20 text-white shadow-md"
                      : "bg-white/5 border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/8"
                  )}
                >
                  {/* Color dot */}
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: UI_CHANNEL_COLORS[ch] }}
                  />
                  {t(`color.${ch}` as any)}
                  
                  {/* Active indicator */}
                  {activeColorChannel === ch && (
                    <motion.div
                      layoutId="color-channel-active"
                      className="absolute inset-0 rounded-lg border-2 border-white/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Channel stats */}
          {colorMeshSet && activeColorChannel !== 'composite' && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                {t('color.channelStats')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  // Channel names now match directly between UI and engine
                  const mesh = colorMeshSet[activeColorChannel as keyof typeof colorMeshSet];
                  if (!mesh?.stats) return null;
                  return (
                    <>
                      <div className="bg-white/5 rounded-lg p-2.5">
                        <span className="text-[9px] text-gray-500 block">{t('export.triangles')}</span>
                        <span className="text-xs font-mono text-white">{mesh.stats.triangles?.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5">
                        <span className="text-[9px] text-gray-500 block">{t('color.vertices')}</span>
                        <span className="text-xs font-mono text-white">{mesh.stats.vertices?.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Palette Mode: AMS configurator + gamut preview
         ═══════════════════════════════════════════════════════════════════ */}
      {engineMode === 'palette' && (
        <>
          {/* Info banner */}
          <div className="flex gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <FlaskConical className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-emerald-300/80 leading-relaxed">
              {t('palette.modePaletteHint')}
            </p>
          </div>

          {/* AMS Slot configurator */}
          <AmsConfigurator />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Filament Manager (modal) — rendered at both modes, toggled from AMS
         ═══════════════════════════════════════════════════════════════════ */}
      <FilamentManager />
    </motion.div>
  );
}
