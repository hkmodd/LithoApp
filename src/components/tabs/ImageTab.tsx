import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import TouchSlider from '../TouchSlider';
import PresetGallery from './PresetGallery';
import { tap } from '../../lib/haptics';

export default function ImageTab() {
  const { lithoParams, updateLithoParams, mode } = useAppStore();
  const { contrast, brightness, sharpness, invert, threshold } = lithoParams;
  const { t } = useTranslation();

  // Live display values — update fluidly during drag
  const [liveThreshold, setLiveThreshold] = useState(threshold);
  const [liveContrast, setLiveContrast] = useState(contrast);
  const [liveBrightness, setLiveBrightness] = useState(brightness);
  const [liveSharpness, setLiveSharpness] = useState(sharpness);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {mode === 'extrusion' ? (
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs text-gray-400">{t('image.threshold')}</label>
            <span className="text-xs font-mono text-[#2563EB]">{liveThreshold}</span>
          </div>
          <TouchSlider min={0} max={255} step={1} value={threshold} onChange={(v) => updateLithoParams({ threshold: v })} onLiveValue={setLiveThreshold} />
          <p className="text-[10px] text-gray-500 leading-relaxed">{t('image.thresholdHint')}</p>
        </div>
      ) : (
        <>
          {/* Preset Gallery — one-click artistic presets */}
          <PresetGallery />
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs text-gray-400">{t('image.contrast')}</label>
              <span className="text-xs font-mono text-[#2563EB]">{liveContrast.toFixed(1)}x</span>
            </div>
            <TouchSlider min={0.0} max={3.0} step={0.1} value={contrast} onChange={(v) => updateLithoParams({ contrast: v })} onLiveValue={setLiveContrast} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs text-gray-400">{t('image.brightness')}</label>
              <span className="text-xs font-mono text-[#2563EB]">{liveBrightness > 0 ? '+' : ''}{liveBrightness.toFixed(2)}</span>
            </div>
            <TouchSlider min={-1.0} max={1.0} step={0.05} value={brightness} onChange={(v) => updateLithoParams({ brightness: v })} onLiveValue={setLiveBrightness} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs text-gray-400">{t('image.edgeEnhancement')}</label>
              <span className="text-xs font-mono text-[#2563EB]">{liveSharpness.toFixed(1)}</span>
            </div>
            <TouchSlider min={0.0} max={2.0} step={0.1} value={sharpness} onChange={(v) => updateLithoParams({ sharpness: v })} onLiveValue={setLiveSharpness} />
            <p className="text-[10px] text-gray-500 leading-relaxed">{t('image.edgeHint')}</p>
          </div>
        </>
      )}
      
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
        <label className="text-xs text-gray-300">{t('image.invertDepth')}</label>
        <button 
          onClick={() => { tap(); updateLithoParams({ invert: !invert }); }}
          className={cn("w-12 h-6 rounded-full transition-colors relative", invert ? "bg-[#2563EB]" : "bg-white/10")}
        >
          <motion.div 
            layout
            className="absolute top-1 bottom-1 w-4 rounded-full bg-white shadow-sm"
            initial={false}
            animate={{ left: invert ? "calc(100% - 20px)" : "4px" }}
          />
        </button>
      </div>
    </motion.div>
  );
}
