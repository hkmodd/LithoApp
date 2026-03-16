/**
 * PresetGallery — One-click artistic presets for lithophane parameters.
 *
 * Each preset adjusts contrast/brightness/sharpness/gamma/invert to
 * achieve a specific look. Shown as a horizontal scrollable strip.
 */

import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import type { LithoParams } from '../../workers/types';
import type { ImageEdits } from '../../workers/types';
import { cn } from '../../lib/utils';

interface Preset {
  id: string;
  /** i18n key for label */
  labelKey: string;
  /** emoji icon */
  icon: string;
  /** Partial lithoParams overrides */
  litho: Partial<LithoParams>;
  /** Partial imageEdits overrides */
  edits: Partial<ImageEdits>;
  /** CSS gradient for the card background */
  gradient: string;
}

const presets: Preset[] = [
  {
    id: 'default',
    labelKey: 'preset.default',
    icon: '⚪',
    litho: { contrast: 1.0, brightness: 0.0, sharpness: 0.0, invert: false },
    edits: { gamma: 1.0, exposure: 0.0 },
    gradient: 'from-gray-700 to-gray-800',
  },
  {
    id: 'highDetail',
    labelKey: 'preset.highDetail',
    icon: '🔍',
    litho: { contrast: 1.4, brightness: 0.0, sharpness: 1.2, invert: false },
    edits: { gamma: 0.9, exposure: 0.0 },
    gradient: 'from-blue-700 to-blue-900',
  },
  {
    id: 'vintage',
    labelKey: 'preset.vintage',
    icon: '📷',
    litho: { contrast: 0.8, brightness: 0.1, sharpness: 0.3, invert: false },
    edits: { gamma: 1.3, exposure: 0.15 },
    gradient: 'from-amber-700 to-amber-900',
  },
  {
    id: 'softGlow',
    labelKey: 'preset.softGlow',
    icon: '✨',
    litho: { contrast: 0.7, brightness: 0.15, sharpness: 0.0, invert: false },
    edits: { gamma: 1.4, exposure: 0.1 },
    gradient: 'from-purple-700 to-purple-900',
  },
  {
    id: 'dramatic',
    labelKey: 'preset.dramatic',
    icon: '🎭',
    litho: { contrast: 2.0, brightness: -0.1, sharpness: 0.8, invert: false },
    edits: { gamma: 0.7, exposure: -0.1 },
    gradient: 'from-red-700 to-red-900',
  },
  {
    id: 'nightLight',
    labelKey: 'preset.nightLight',
    icon: '🌙',
    litho: { contrast: 1.2, brightness: 0.2, sharpness: 0.5, invert: false, baseThickness: 0.6, maxThickness: 2.5 },
    edits: { gamma: 1.1, exposure: 0.05 },
    gradient: 'from-indigo-700 to-indigo-900',
  },
  {
    id: 'inverted',
    labelKey: 'preset.inverted',
    icon: '🔄',
    litho: { contrast: 1.0, brightness: 0.0, sharpness: 0.0, invert: true },
    edits: { gamma: 1.0, exposure: 0.0 },
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    id: 'bold',
    labelKey: 'preset.bold',
    icon: '💪',
    litho: { contrast: 1.8, brightness: -0.05, sharpness: 1.5, invert: false, baseThickness: 1.0, maxThickness: 4.0 },
    edits: { gamma: 0.8, exposure: 0.0 },
    gradient: 'from-emerald-700 to-emerald-900',
  },
];

export default function PresetGallery() {
  const { updateLithoParams, lithoParams, updateImageEdits, imageEdits } = useAppStore();
  const { t } = useTranslation();

  const applyPreset = (preset: Preset) => {
    updateLithoParams(preset.litho);
    updateImageEdits(preset.edits);
  };

  /** Check if a preset matches current params (rough) */
  const isActive = (preset: Preset): boolean => {
    for (const [key, value] of Object.entries(preset.litho)) {
      if ((lithoParams as unknown as Record<string, unknown>)[key] !== value) return false;
    }
    for (const [key, value] of Object.entries(preset.edits)) {
      if ((imageEdits as unknown as Record<string, unknown>)[key] !== value) return false;
    }
    return true;
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
        {t('preset.label')}
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
        {presets.map((preset) => {
          const active = isActive(preset);
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all min-w-[72px]',
                active
                  ? 'border-[#2563EB] bg-[#2563EB]/10 shadow-[0_0_12px_rgba(37,99,235,0.2)]'
                  : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-sm',
                preset.gradient
              )}>
                {preset.icon}
              </div>
              <span className={cn(
                'text-[9px] font-medium leading-tight text-center',
                active ? 'text-white' : 'text-gray-400'
              )}>
                {t(preset.labelKey as Parameters<typeof t>[0])}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
