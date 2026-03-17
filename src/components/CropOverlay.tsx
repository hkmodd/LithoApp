/**
 * CropOverlay — visual crop rectangle rendered on top of the image preview.
 * 
 * Reads crop state from useCropStore.
 * Handles pointer drag to resize/move the crop area.
 * Must be rendered inside a positioned container wrapping the image.
 */

import { useRef } from 'react';
import { useCropStore } from '../store/useCropStore';

export default function CropOverlay() {
  const { isCropping, rect, updateRect, setRect } = useCropStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    originX: number;
    originY: number;
    startRect: typeof rect;
  } | null>(null);

  if (!isCropping) return null;

  const left = Math.min(rect.startX, rect.endX) * 100;
  const top = Math.min(rect.startY, rect.endY) * 100;
  const width = Math.abs(rect.endX - rect.startX) * 100;
  const height = Math.abs(rect.endY - rect.startY) * 100;

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const handlePointerDown = (e: React.PointerEvent, handle: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      originX: e.clientX,
      originY: e.clientY,
      startRect: { ...rect },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.originX) / bounds.width;
    const dy = (e.clientY - dragRef.current.originY) / bounds.height;
    const { startRect, handle } = dragRef.current;

    if (handle === 'move') {
      const w = startRect.endX - startRect.startX;
      const h = startRect.endY - startRect.startY;
      let nx = clamp(startRect.startX + dx);
      let ny = clamp(startRect.startY + dy);
      if (nx + w > 1) nx = 1 - w;
      if (ny + h > 1) ny = 1 - h;
      setRect({ startX: nx, startY: ny, endX: nx + w, endY: ny + h });
    } else if (handle === 'nw') {
      updateRect({ startX: clamp(startRect.startX + dx), startY: clamp(startRect.startY + dy) });
    } else if (handle === 'ne') {
      updateRect({ endX: clamp(startRect.endX + dx), startY: clamp(startRect.startY + dy) });
    } else if (handle === 'sw') {
      updateRect({ startX: clamp(startRect.startX + dx), endY: clamp(startRect.endY + dy) });
    } else if (handle === 'se') {
      updateRect({ endX: clamp(startRect.endX + dx), endY: clamp(startRect.endY + dy) });
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Darkened areas outside crop */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Clear crop region */}
      <div
        className="absolute border-2 border-white/90 cursor-move"
        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        {/* Clear inside (removes the darken overlay via mix-blend) */}
        <div className="absolute inset-0 bg-transparent" />
        {/* Rule of thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
        {/* Corner drag handles */}
        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
          <div
            key={corner}
            className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-[#2563EB] -translate-x-1/2 -translate-y-1/2 cursor-crosshair z-20 touch-none"
            style={{
              left: corner.includes('e') ? '100%' : '0%',
              top: corner.includes('s') ? '100%' : '0%',
            }}
            onPointerDown={(e) => handlePointerDown(e, corner)}
          />
        ))}
      </div>
    </div>
  );
}
