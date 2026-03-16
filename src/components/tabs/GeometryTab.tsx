import { motion } from 'framer-motion';
import { Square, Cylinder, Circle, Heart, Triangle, FlaskConical, Hexagon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import type { LithoShape } from '../../workers/types';
import { useTranslation } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import TouchSlider from '../TouchSlider';

export default function GeometryTab() {
  const { lithoParams, updateLithoParams } = useAppStore();
  const { shape, physicalSize, resolution, baseThickness, maxThickness, smoothing } = lithoParams;
  const { t } = useTranslation();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
      {/* Shape Selector */}
      <div className="space-y-3">
        <label className="text-xs text-gray-400">{t('geo.shape')}</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'flat', labelKey: 'geo.flat' as TranslationKey, icon: Square },
            { id: 'arc', labelKey: 'geo.arc' as TranslationKey, icon: Cylinder },
            { id: 'cylinder', labelKey: 'geo.cylinder' as TranslationKey, icon: Cylinder },
            { id: 'sphere', labelKey: 'geo.sphere' as TranslationKey, icon: Circle },
            { id: 'heart', labelKey: 'geo.heart' as TranslationKey, icon: Heart },
            { id: 'lampshade', labelKey: 'geo.lampshade' as TranslationKey, icon: Triangle },
            { id: 'vase', labelKey: 'geo.vase' as TranslationKey, icon: FlaskConical },
            { id: 'dome', labelKey: 'geo.dome' as TranslationKey, icon: Circle },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => updateLithoParams({ shape: s.id as LithoShape })}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border transition-all",
                shape === s.id 
                  ? "border-[#2563EB] bg-[#2563EB]/10 text-white" 
                  : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              )}
            >
              <s.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{t(s.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('geo.maxDimension')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{physicalSize}mm</span>
        </div>
        <TouchSlider min={50} max={300} step={10} value={physicalSize} onChange={(v) => updateLithoParams({ physicalSize: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('geo.meshDensity')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{resolution}px</span>
        </div>
        <TouchSlider min={64} max={512} step={32} value={resolution} onChange={(v) => updateLithoParams({ resolution: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('geo.baseThickness')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{baseThickness.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={0.2} max={2.0} step={0.1} value={baseThickness} onChange={(v) => updateLithoParams({ baseThickness: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('geo.maxThickness')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{maxThickness.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={1.0} max={10.0} step={0.1} value={maxThickness} onChange={(v) => updateLithoParams({ maxThickness: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('geo.smoothing')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{smoothing} {t('geo.smoothingUnit')}</span>
        </div>
        <TouchSlider min={0} max={5} step={1} value={smoothing} onChange={(v) => updateLithoParams({ smoothing: v })} />
      </div>
    </motion.div>
  );
}
