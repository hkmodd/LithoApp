import { motion } from 'framer-motion';
import { Square, Cylinder, Link } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import TouchSlider from '../TouchSlider';

export default function FrameTab() {
  const { lithoParams, updateLithoParams } = useAppStore();
  const { shape, borderWidth, frameThickness, baseStand, hanger, curveAngle } = lithoParams;
  const { t } = useTranslation();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('frame.borderWidth')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{borderWidth.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={0} max={10.0} step={0.5} value={borderWidth} onChange={(v) => updateLithoParams({ borderWidth: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400">{t('frame.frameThickness')}</label>
          <span className="text-xs font-mono text-[#2563EB]">{frameThickness.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={1.0} max={15.0} step={0.5} value={frameThickness} onChange={(v) => updateLithoParams({ frameThickness: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <Square className="w-3 h-3" /> {t('frame.baseStand')}
          </label>
          <span className="text-xs font-mono text-[#2563EB]">{baseStand.toFixed(1)}mm</span>
        </div>
        <TouchSlider min={0} max={20.0} step={1.0} value={baseStand} onChange={(v) => updateLithoParams({ baseStand: v })} />
      </div>

      {(shape === 'flat' || shape === 'arc' || shape === 'heart') && (
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => updateLithoParams({ hanger: !hanger })}
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
            <span className="text-xs font-mono text-[#2563EB]">{curveAngle}°</span>
          </div>
          <TouchSlider min={0} max={360} step={5} value={curveAngle} onChange={(v) => updateLithoParams({ curveAngle: v })} />
          {curveAngle >= 359.9 && (
            <p className="text-[10px] text-emerald-400 leading-relaxed bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              {t('frame.fullCylinder')}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
