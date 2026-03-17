import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  formatValue?: (v: number) => string;
}

/**
 * Custom div-based slider that solves the mobile scroll-vs-slide conflict.
 *
 * Why not <input type="range">:
 *   Native range inputs capture touch on first contact and immediately
 *   move the thumb — there is NO CSS property that prevents this.
 *   Any amount of touch-action / pointer-events hacks either break the
 *   slider entirely or still let accidental changes through.
 *
 * How this works:
 *   - The visible slider (track + fill + thumb) is built from divs.
 *   - The container has touch-action:pan-y → vertical scroll freely.
 *   - On touchstart → record position, do NOT activate slider.
 *   - On touchmove → dead-zone (12px). If horizontal > vertical → lock
 *     to slider mode (preventDefault to kill scroll). If vertical → stop
 *     tracking, browser scrolls naturally.
 *   - On desktop → plain mousedown/move/up, no dead zone needed.
 *   - A hidden <input> remains for screen reader accessibility.
 */

const DEAD_ZONE = 12;

function snapValue(raw: number, step: number, min: number, max: number): number {
  const snapped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, parseFloat(snapped.toFixed(10))));
}

export default function TouchSlider({
  min, max, step, value, onChange, className = '',
}: TouchSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);
  const committedRef = useRef(value);
  const trackRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(value); // always-fresh value for event closures
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch discrimination state
  const touchRef = useRef<{
    startX: number;
    startY: number;
    decided: boolean;
    sliding: boolean;
  } | null>(null);

  // Sync external → local when not dragging
  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
      committedRef.current = value;
      latestRef.current = value;
    }
  }, [value]);

  // Cleanup live timer on unmount
  useEffect(() => () => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
  }, []);

  // --- Shared: position → value ---
  const posToValue = useCallback((clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapValue(min + ratio * (max - min), step, min, max);
  }, [min, max, step, value]);

  const setAndTrack = useCallback((v: number) => {
    latestRef.current = v;
    setLocalValue(v);
  }, []);

  // Throttled live update — fires onChange at most every LIVE_THROTTLE_MS
  // during drag, giving the 3D preview live feedback. The 250ms debounce
  // in processImage coalesces these naturally.
  const LIVE_THROTTLE_MS = 80;
  const liveUpdate = useCallback((v: number) => {
    if (liveTimerRef.current) return; // already scheduled
    liveTimerRef.current = setTimeout(() => {
      liveTimerRef.current = null;
      const current = latestRef.current;
      if (current !== committedRef.current) {
        committedRef.current = current;
        onChange(current);
      }
    }, LIVE_THROTTLE_MS);
  }, [onChange]);

  const commit = useCallback((v: number) => {
    isDragging.current = false;
    // Cancel any pending live update — commit is authoritative
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (v !== committedRef.current) {
      committedRef.current = v;
      onChange(v);
    }
  }, [onChange]);

  // ─── DESKTOP: mouse events ─────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const v = posToValue(e.clientX);
    setAndTrack(v);
    liveUpdate(v);

    const onMove = (me: MouseEvent) => {
      const v2 = posToValue(me.clientX);
      setAndTrack(v2);
      liveUpdate(v2);
    };
    const onUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      commit(posToValue(me.clientX));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [posToValue, setAndTrack, liveUpdate, commit]);

  // ─── MOBILE: touch events (with dead zone) ─────────────────────────
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        decided: false,
        sliding: false,
      };
      // Don't preventDefault — let browser start pan-y if user scrolls
    };

    const onTouchMove = (e: TouchEvent) => {
      const state = touchRef.current;
      if (!state) return;

      const t = e.touches[0];
      const dx = Math.abs(t.clientX - state.startX);
      const dy = Math.abs(t.clientY - state.startY);

      if (!state.decided) {
        // Still inside dead zone
        if (dx < DEAD_ZONE && dy < DEAD_ZONE) return;

        state.decided = true;

        if (dx > dy) {
          // ✅ Horizontal intent → slider mode
          state.sliding = true;
          isDragging.current = true;
          e.preventDefault(); // kill any scroll that started
        } else {
          // ✅ Vertical intent → let scroll happen, stop tracking
          touchRef.current = null;
          return;
        }
      }

      if (state.sliding) {
        e.preventDefault();
        const v = posToValue(t.clientX);
        setAndTrack(v);
        liveUpdate(v);
      }
    };

    const onTouchEnd = () => {
      const state = touchRef.current;
      touchRef.current = null;
      if (state?.sliding) {
        commit(latestRef.current);
      }
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    track.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove);
      track.removeEventListener('touchend', onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [posToValue, setAndTrack, liveUpdate, commit]);

  // ─── Visual rendering ──────────────────────────────────────────────
  const range = max - min;
  const progress = range > 0 ? (localValue - min) / range : 0;

  return (
    <div
      ref={trackRef}
      onMouseDown={onMouseDown}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={localValue}
      tabIndex={0}
      className={`relative select-none cursor-pointer ${className}`}
      style={{
        touchAction: 'pan-y',   // ← let browser handle vertical scroll
        height: 44,             // generous touch target
        display: 'flex',
        alignItems: 'center',
      }}
      onKeyDown={(e) => {
        // Keyboard accessibility
        let next = localValue;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, localValue + step);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(min, localValue - step);
        else if (e.key === 'Home') next = min;
        else if (e.key === 'End') next = max;
        else return;
        e.preventDefault();
        setAndTrack(next);
        commit(next);
      }}
    >
      {/* Track background */}
      <div
        className="absolute left-0 right-0 rounded-full"
        style={{
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.15)',
        }}
      />

      {/* Track fill (active portion) */}
      <div
        className="absolute left-0 rounded-full"
        style={{
          height: 4,
          width: `${progress * 100}%`,
          backgroundColor: '#2563EB',
          transition: isDragging.current ? 'none' : 'width 0.1s ease',
        }}
      />

      {/* Thumb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 18,
          height: 18,
          backgroundColor: '#2563EB',
          boxShadow: '0 0 0 2px rgba(37,99,235,0.3)',
          left: `calc(${progress * 100}% - 9px)`,
          transition: isDragging.current ? 'none' : 'left 0.1s ease',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Hidden native input for screen readers */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => {
          const v = Number(e.target.value);
          setAndTrack(v);
          commit(v);
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
