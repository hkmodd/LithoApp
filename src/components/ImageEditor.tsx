/**
 * ImageEditor — Non-destructive image editing toolbar.
 * Provides rotate, flip, crop, gamma, exposure controls.
 * Sits below the image preview in the sidebar.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Crop, Sun, Contrast, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';
import { hasEdits } from '../lib/imageProcessor';
import TouchSlider from './TouchSlider';
import { cn } from '../lib/utils';

interface CropState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function ImageEditor() {
  const { imageEdits, updateImageEdits, resetImageEdits, originalImage } = useAppStore();
  const { t } = useTranslation();
  const [cropState, setCropState] = useState<CropState>({
    active: false,
    startX: 0.1,
    startY: 0.1,
    endX: 0.9,
    endY: 0.9,
  });
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, endX: 0, endY: 0 });

  const modified = hasEdits(imageEdits);

  // Don't render if no image is loaded
  if (!originalImage) return null;

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
      // Apply crop
      const x = Math.min(cropState.startX, cropState.endX);
      const y = Math.min(cropState.startY, cropState.endY);
      const w = Math.abs(cropState.endX - cropState.startX);
      const h = Math.abs(cropState.endY - cropState.startY);
      if (w > 0.05 && h > 0.05) {
        updateImageEdits({ cropRect: { x, y, w, h } });
      }
      setIsCropping(false);
    } else {
      // Start cropping — initialize from existing crop or full image
      const existing = imageEdits.cropRect;
      setCropState({
        active: true,
        startX: existing?.x ?? 0.05,
        startY: existing?.y ?? 0.05,
        endX: existing ? existing.x + existing.w : 0.95,
        endY: existing ? existing.y + existing.h : 0.95,
      });
      setIsCropping(true);
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
  };

  const handleClearCrop = () => {
    updateImageEdits({ cropRect: null });
    setIsCropping(false);
  };

  // --- Crop drag handlers ---
  const handleCropPointerDown = (e: React.PointerEvent, handle: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(handle);
    const rect = cropRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: cropState.startX,
      startY: cropState.startY,
      endX: cropState.endX,
      endY: cropState.endY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !cropRef.current) return;
    const rect = cropRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.x) / rect.width;
    const dy = (e.clientY - dragStartRef.current.y) / rect.height;
    const { startX: osx, startY: osy, endX: oex, endY: oey } = dragStartRef.current;

    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    if (isDragging === 'move') {
      const w = oex - osx;
      const h = oey - osy;
      let nx = clamp(osx + dx);
      let ny = clamp(osy + dy);
      if (nx + w > 1) nx = 1 - w;
      if (ny + h > 1) ny = 1 - h;
      setCropState(s => ({ ...s, startX: nx, startY: ny, endX: nx + w, endY: ny + h }));
    } else if (isDragging === 'nw') {
      setCropState(s => ({ ...s, startX: clamp(osx + dx), startY: clamp(osy + dy) }));
    } else if (isDragging === 'ne') {
      setCropState(s => ({ ...s, endX: clamp(oex + dx), startY: clamp(osy + dy) }));
    } else if (isDragging === 'sw') {
      setCropState(s => ({ ...s, startX: clamp(osx + dx), endY: clamp(oey + dy) }));
    } else if (isDragging === 'se') {
      setCropState(s => ({ ...s, endX: clamp(oex + dx), endY: clamp(oey + dy) }));
    }
  };

  const handleCropPointerUp = () => {
    setIsDragging(null);
  };

  // Render crop overlay on the image preview
  const renderCropOverlay = () => {
    if (!isCropping) return null;
    const left = Math.min(cropState.startX, cropState.endX) * 100;
    const top = Math.min(cropState.startY, cropState.endY) * 100;
    const width = Math.abs(cropState.endX - cropState.startX) * 100;
    const height = Math.abs(cropState.endY - cropState.startY) * 100;

    return (
      <div
        ref={cropRef}
        className="absolute inset-0 z-10"
        onPointerMove={handleCropPointerMove}
        onPointerUp={handleCropPointerUp}
      >
        {/* Darkened areas outside crop */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Clear crop region */}
        <div
          className="absolute border-2 border-white/90 cursor-move"
          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
          onPointerDown={(e) => handleCropPointerDown(e, 'move')}
        >
          {/* Clear inside */}
          <div className="absolute inset-0 bg-white/0" />
          {/* Grid lines (rule of thirds) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
          </div>
          {/* Corner handles */}
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <div
              key={corner}
              className="absolute w-4 h-4 bg-white rounded-full shadow-lg border border-black/30 -translate-x-1/2 -translate-y-1/2 cursor-crosshair z-20"
              style={{
                left: corner.includes('e') ? '100%' : '0%',
                top: corner.includes('s') ? '100%' : '0%',
              }}
              onPointerDown={(e) => handleCropPointerDown(e, corner)}
            />
          ))}
        </div>
      </div>
    );
  };

  const ToolBtn = ({ icon: Icon, label, onClick, active = false }: {
    icon: LucideIcon; label: string; onClick: () => void; active?: boolean;
  }) => (
    <button
      onClick={onClick}
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
      {/* Crop overlay — rendered as a portal-like overlay on the image preview above */}
      {/* (The actual overlay rendering happens in App.tsx via the isCropping state) */}

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
            onClick={() => { resetImageEdits(); setIsCropping(false); }}
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
          <span className="text-xs font-mono text-[#2563EB]">{imageEdits.gamma.toFixed(2)}</span>
        </div>
        <TouchSlider
          min={0.2}
          max={3.0}
          step={0.05}
          value={imageEdits.gamma}
          onChange={(v) => updateImageEdits({ gamma: v })}
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
            {imageEdits.exposure > 0 ? '+' : ''}{imageEdits.exposure.toFixed(2)}
          </span>
        </div>
        <TouchSlider
          min={-1.0}
          max={1.0}
          step={0.05}
          value={imageEdits.exposure}
          onChange={(v) => updateImageEdits({ exposure: v })}
        />
      </div>

      {/* Crop overlay component — used by parent */}
      {isCropping && (
        <CropOverlayPortal>
          {renderCropOverlay()}
        </CropOverlayPortal>
      )}
    </motion.div>
  );
}

/**
 * Portal-like component to render crop overlay.
 * We export the crop overlay rendering so App.tsx can place it
 * on top of the image preview.
 */
function CropOverlayPortal({ children }: { children: React.ReactNode }) {
  // The crop overlay is rendered inline here but the parent positions it
  return <>{children}</>;
}

/**
 * Standalone crop overlay component for use directly on the image preview.
 * This avoids the complexity of portals.
 */
export function ImageCropOverlay() {
  // For now, the crop overlay is rendered inline in ImageEditor.
  // A future refactor could use React portals to position it on the image.
  return null;
}
