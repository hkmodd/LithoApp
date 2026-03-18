import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Cylinder, Link, ChevronDown, Printer } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import type { LithoShape } from '../../workers/types';
import TouchSlider from '../TouchSlider';
import { tap } from '../../lib/haptics';

const SLICER_TIPS: Record<string, { layerHeight: string; infill: string; orientation: string; supports: string }> = {
  flat:      { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Vertical (standing up)', supports: 'None' },
  arc:       { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Concave side up', supports: 'None' },
  cylinder:  { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Vertical (axis up)', supports: 'None' },
  sphere:    { layerHeight: '0.08–0.12 mm', infill: '100%', orientation: 'Pole up', supports: 'Light — bottom pole' },
  heart:     { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Vertical (standing up)', supports: 'None' },
  lampshade: { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Wide end down', supports: 'None (self-supporting taper)' },
  vase:      { layerHeight: '0.12–0.16 mm', infill: '100%', orientation: 'Base down', supports: 'None (smooth profile)' },
  dome:      { layerHeight: '0.08–0.12 mm', infill: '100%', orientation: 'Open end down', supports: 'Light — apex area' },
};

export default function FrameTab() {
  const lithoParams = useAppStore(s => s.lithoParams);
  const updateLithoParams = useAppStore(s => s.updateLithoParams);
  const { shape, borderWidth, frameThickness, baseStand, hanger, curveAngle } = lithoParams;
  const { t } = useTranslation();
  const [tipsOpen, setTipsOpen] = useState(false);
  const tips = SLICER_TIPS[shape] || SLICER_TIPS.flat;

  // Live display values — fluid during drag
  const [liveBorderWidth, setLiveBorderWidth] = useState(borderWidth);
  const [liveFrameThickness, setLiveFrameThickness] = useState(frameThickness);
  const [liveBaseStand, setLiveBaseStand] = useState(baseStand);
  const [liveCurveAngle, setLiveCurveAngle] = useState(curveAngle);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('frame.borderWidth')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{liveBorderWidth.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={0} max={10.0} step={0.5} value={borderWidth} onChange={(v) => updateLithoParams({ borderWidth: v })} onLiveValue={setLiveBorderWidth} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('frame.frameThickness')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{liveFrameThickness.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={1.0} max={15.0} step={0.5} value={frameThickness} onChange={(v) => updateLithoParams({ frameThickness: v })} onLiveValue={setLiveFrameThickness} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <Square className="w-3 h-3" /> {t('frame.baseStand')}
          </label>
          <span className="text-xs font-mono text-[#2563EB]">{liveBaseStand.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={0} max={20.0} step={1.0} value={baseStand} onChange={(v) => updateLithoParams({ baseStand: v })} onLiveValue={setLiveBaseStand} />
      </div>

      {(shape === 'flat' || shape === 'arc' || shape === 'heart') && (
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => { tap(); updateLithoParams({ hanger: !hanger }); }}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
              hanger 
                ? "border-[#2563EB] bg-[#2563EB]/10 text-white" 
                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              <span className="text-sm font-medium">{t('frame.addHanger')}</span>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full transition-colors relative",
              hanger ? "bg-[#2563EB]" : "bg-gray-600"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                hanger ? "left-4.5" : "left-0.5"
              )} />
            </div>
          </button>
          <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
            {t('frame.hangerHint')}
          </p>
        </div>
      )}

      {shape === 'arc' && (
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Cylinder className="w-3 h-3" /> {t('frame.curveAngle')}
            </label>
            <span className="text-xs font-mono text-[#2563EB]">{liveCurveAngle}°</span>
          </div>
          <TouchSlider min={0} max={360} step={5} value={curveAngle} onChange={(v) => updateLithoParams({ curveAngle: v })} onLiveValue={setLiveCurveAngle} />
          {liveCurveAngle >= 359.9 && (
            <p className="text-[10px] text-emerald-400 leading-relaxed bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              {t('frame.fullCylinder')}
            </p>
          )}
        </div>
      )}

      {/* ── Slicer Advisor ─────────────────────────────── */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={() => { tap(); setTipsOpen(!tipsOpen); }}
          className="w-full flex items-center justify-between text-xs text-gray-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            {t('slicer.title')}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", tipsOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {tipsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                {([
                  ['slicer.layerHeight', tips.layerHeight],
                  ['slicer.infill', tips.infill],
                  ['slicer.orientation', tips.orientation],
                  ['slicer.supports', tips.supports],
                ] as const).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-amber-300/80 shrink-0">{t(key)}</span>
                    <span className="text-[10px] text-gray-300 text-right">{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
