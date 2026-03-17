/**
 * ImageEditor — Non-destructive image editing toolbar.
 * Provides rotate, flip, crop, gamma, exposure controls.
 * Sits below the image preview in the sidebar.
 * 
 * Crop visual overlay is rendered separately by CropOverlay.tsx
 * on top of the image preview. Both share state via useCropStore.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Crop, Sun, Contrast, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useCropStore } from '../store/useCropStore';
import { useTranslation } from '../i18n';
import { hasEdits } from '../lib/imageProcessor';
import TouchSlider from './TouchSlider';
import { cn } from '../lib/utils';
import { tap } from '../lib/haptics';

export default function ImageEditor() {
  const { imageEdits, updateImageEdits, resetImageEdits, originalImage } = useAppStore();
  const { isCropping, rect, startCrop, cancelCrop, stopCrop } = useCropStore();
  const { t } = useTranslation();

  const modified = hasEdits(imageEdits);

  // Don't render if no image is loaded
  if (!originalImage) return null;

  // Live display values — fluid during drag
  const [liveGamma, setLiveGamma] = useState(imageEdits.gamma);
  const [liveExposure, setLiveExposure] = useState(imageEdits.exposure);

  const handleRotateLeft = () => {
    const current = imageEdits.rotation;
    const next = ((current - 90 + 360) % 360) as 0 | 90 | 180 | 270;
    updateImageEdits({ rotation: next });
  };

  const handleRotateRight = () => {
    const current = imageEdits.rotation;
    const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;
    updateImageEdits({ rotation: next });
  };

  const handleFlipH = () => updateImageEdits({ flipH: !imageEdits.flipH });
  const handleFlipV = () => updateImageEdits({ flipV: !imageEdits.flipV });

  const handleCropToggle = () => {
    if (isCropping) {
      // Apply crop from shared store rect
      const x = Math.min(rect.startX, rect.endX);
      const y = Math.min(rect.startY, rect.endY);
      const w = Math.abs(rect.endX - rect.startX);
      const h = Math.abs(rect.endY - rect.startY);
      if (w > 0.05 && h > 0.05) {
        updateImageEdits({ cropRect: { x, y, w, h } });
      }
      stopCrop();
    } else {
      // Start cropping — initialize from existing crop or full image
      startCrop(imageEdits.cropRect);
    }
  };

  const handleCropCancel = () => {
    cancelCrop();
  };

  const handleClearCrop = () => {
    updateImageEdits({ cropRect: null });
    cancelCrop();
  };

  const ToolBtn = ({ icon: Icon, label, onClick, active = false }: {
    icon: LucideIcon; label: string; onClick: () => void; active?: boolean;
  }) => (
    <button
      onClick={() => { tap(); onClick(); }}
      title={label}
      className={cn(
        "p-2 rounded-lg transition-colors duration-75 text-gray-400 hover:text-white hover:bg-white/10",
        active && "text-[#2563EB] bg-[#2563EB]/10 hover:text-[#2563EB]"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 overflow-hidden"
    >
      {/* Transform toolbar */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
        <ToolBtn icon={RotateCcw} label={t('editor.rotateLeft')} onClick={handleRotateLeft} />
        <ToolBtn icon={RotateCw} label={t('editor.rotateRight')} onClick={handleRotateRight} />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={FlipHorizontal} label={t('editor.flipH')} onClick={handleFlipH} active={imageEdits.flipH} />
        <ToolBtn icon={FlipVertical} label={t('editor.flipV')} onClick={handleFlipV} active={imageEdits.flipV} />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn icon={Crop} label={t('editor.crop')} onClick={handleCropToggle} active={isCropping || !!imageEdits.cropRect} />

        {/* Spacer + Reset */}
        <div className="flex-1" />
        {modified && (
          <button
            onClick={() => { resetImageEdits(); cancelCrop(); }}
            title={t('editor.reset')}
            className="p-2 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-colors duration-75"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Crop action buttons */}
      <AnimatePresence>
        {isCropping && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={handleCropToggle}
              className="flex-1 py-1.5 text-xs font-medium bg-[#2563EB] hover:bg-[#2563EB]/80 text-white rounded-lg transition-colors"
            >
              {t('editor.applyCrop')}
            </button>
            <button
              onClick={handleCropCancel}
              className="flex-1 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors"
            >
              {t('editor.cancelCrop')}
            </button>
            {imageEdits.cropRect && (
              <button
                onClick={handleClearCrop}
                className="py-1.5 px-3 text-xs font-medium text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gamma slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            <Contrast className="w-3 h-3" />
            {t('editor.gamma')}
          </label>
          <span className="text-xs font-mono text-[#2563EB]">{liveGamma.toFixed(2)}</span>
        </div>
        <TouchSlider
          min={0.2}
          max={3.0}
          step={0.05}
          value={imageEdits.gamma}
          onChange={(v) => updateImageEdits({ gamma: v })}
          onLiveValue={setLiveGamma}
        />
      </div>

      {/* Exposure slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            <Sun className="w-3 h-3" />
            {t('editor.exposure')}
          </label>
          <span className="text-xs font-mono text-[#2563EB]">
            {liveExposure > 0 ? '+' : ''}{liveExposure.toFixed(2)}
          </span>
        </div>
        <TouchSlider
          min={-1.0}
          max={1.0}
          step={0.05}
          value={imageEdits.exposure}
          onChange={(v) => updateImageEdits({ exposure: v })}
          onLiveValue={setLiveExposure}
        />
      </div>
    </motion.div>
  );
}
