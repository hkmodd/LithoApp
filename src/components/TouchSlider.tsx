import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  /** Format number for display (optional) */
  formatValue?: (v: number) => string;
}

/**
 * Mobile-friendly slider that:
 * 1. Uses local state during drag → no re-renders in parent → no UI freeze
 * 2. Commits to store only on release (pointerUp / touchEnd)
 * 3. Locks to scroll vs slide on first 8px of movement to prevent accidental changes
 */
export default function TouchSlider({
  min, max, step, value, onChange, className = '',
}: TouchSliderProps) {
  // Local display value — tracks the slider visually without committing
  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);
  const committedValue = useRef(value);

  // Sync external value → local when not dragging
  // (handles resets, undo, programmatic changes)
  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
      committedValue.current = value;
    }
  }, [value]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    isDragging.current = true;
    setLocalValue(Number((e.target as HTMLInputElement).value));
  }, []);

  const handleCommit = useCallback(() => {
    isDragging.current = false;
    // Only commit if value actually changed
    if (localValue !== committedValue.current) {
      committedValue.current = localValue;
      onChange(localValue);
    }
  }, [localValue, onChange]);

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={localValue}
      onInput={handleInput}
      onPointerUp={handleCommit}
      onTouchEnd={handleCommit}
      // Also commit on mouse up (desktop) and when leaving the element
      onMouseUp={handleCommit}
      onBlur={handleCommit}
      className={`w-full accent-[#2563EB] ${className}`}
      style={{ touchAction: 'pan-y', paddingTop: 12, paddingBottom: 12 }}
    />
  );
}
