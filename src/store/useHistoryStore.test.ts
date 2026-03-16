import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from './useHistoryStore';
import type { LithoParams } from '../workers/types';

/** Factory for creating LithoParams with sensible defaults + overrides */
function makeParams(overrides: Partial<LithoParams> = {}): LithoParams {
  return {
    shape: 'flat',
    resolution: 256,
    physicalSize: 100,
    baseThickness: 0.8,
    maxThickness: 3.2,
    borderWidth: 3.0,
    frameThickness: 5.0,
    baseStand: 0.0,
    curveAngle: 120,
    smoothing: 1,
    contrast: 1.0,
    brightness: 0.0,
    sharpness: 0.0,
    invert: false,
    hanger: false,
    threshold: 128,
    ...overrides,
  };
}

describe('useHistoryStore', () => {
  beforeEach(() => {
    // Reset store to a clean state between tests
    useHistoryStore.getState().clear();
  });

  it('starts with empty state', () => {
    const state = useHistoryStore.getState();
    expect(state.past).toEqual([]);
    expect(state.present).toBeNull();
    expect(state.future).toEqual([]);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('init sets present without past or future', () => {
    const params = makeParams();
    useHistoryStore.getState().init(params);

    const state = useHistoryStore.getState();
    expect(state.present).toEqual(params);
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('push moves present to past and sets new present', () => {
    const initial = makeParams();
    const updated = makeParams({ contrast: 2.0 });

    useHistoryStore.getState().init(initial);
    useHistoryStore.getState().push(updated);

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toEqual(initial);
    expect(state.present).toEqual(updated);
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
  });

  it('push with identical params is a no-op', () => {
    const params = makeParams();
    useHistoryStore.getState().init(params);
    useHistoryStore.getState().push(makeParams()); // identical

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.canUndo).toBe(false);
  });

  it('push clears future (branching)', () => {
    const a = makeParams();
    const b = makeParams({ contrast: 2.0 });
    const c = makeParams({ contrast: 3.0 });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);
    useHistoryStore.getState().undo(); // now present=a, future=[b]

    expect(useHistoryStore.getState().canRedo).toBe(true);

    // Push new change — should discard the redo stack
    useHistoryStore.getState().push(c);

    const state = useHistoryStore.getState();
    expect(state.future).toHaveLength(0);
    expect(state.canRedo).toBe(false);
    expect(state.present).toEqual(c);
  });

  it('undo restores previous params', () => {
    const a = makeParams();
    const b = makeParams({ brightness: 0.5 });
    const c = makeParams({ brightness: 1.0 });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);
    useHistoryStore.getState().push(c);

    const restored = useHistoryStore.getState().undo();
    expect(restored).toEqual(b);

    const state = useHistoryStore.getState();
    expect(state.present).toEqual(b);
    expect(state.past).toHaveLength(1); // [a]
    expect(state.future).toHaveLength(1); // [c]
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(true);
  });

  it('undo returns null when nothing to undo', () => {
    const params = makeParams();
    useHistoryStore.getState().init(params);

    const result = useHistoryStore.getState().undo();
    expect(result).toBeNull();
    expect(useHistoryStore.getState().present).toEqual(params);
  });

  it('redo restores undone params', () => {
    const a = makeParams();
    const b = makeParams({ sharpness: 1.5 });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);
    useHistoryStore.getState().undo();

    const restored = useHistoryStore.getState().redo();
    expect(restored).toEqual(b);

    const state = useHistoryStore.getState();
    expect(state.present).toEqual(b);
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(0);
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
  });

  it('redo returns null when nothing to redo', () => {
    const params = makeParams();
    useHistoryStore.getState().init(params);

    const result = useHistoryStore.getState().redo();
    expect(result).toBeNull();
  });

  it('multiple undo/redo round-trip preserves data', () => {
    const a = makeParams();
    const b = makeParams({ shape: 'cylinder' });
    const c = makeParams({ shape: 'sphere' });
    const d = makeParams({ shape: 'heart' });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);
    useHistoryStore.getState().push(c);
    useHistoryStore.getState().push(d);

    // Undo 3 times back to A
    expect(useHistoryStore.getState().undo()).toEqual(c);
    expect(useHistoryStore.getState().undo()).toEqual(b);
    expect(useHistoryStore.getState().undo()).toEqual(a);
    expect(useHistoryStore.getState().canUndo).toBe(false);

    // Redo 3 times back to D
    expect(useHistoryStore.getState().redo()).toEqual(b);
    expect(useHistoryStore.getState().redo()).toEqual(c);
    expect(useHistoryStore.getState().redo()).toEqual(d);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('caps history at 50 entries', () => {
    const initial = makeParams();
    useHistoryStore.getState().init(initial);

    // Push 60 distinct entries
    for (let i = 1; i <= 60; i++) {
      useHistoryStore.getState().push(makeParams({ resolution: i }));
    }

    const state = useHistoryStore.getState();
    expect(state.past.length).toBeLessThanOrEqual(50);
    // The oldest entries should have been trimmed
    expect(state.past[0].resolution).toBeGreaterThan(1);
  });

  it('clear resets everything', () => {
    const a = makeParams();
    const b = makeParams({ contrast: 2.0 });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);
    useHistoryStore.getState().clear();

    const state = useHistoryStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.present).toBeNull();
    expect(state.future).toHaveLength(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('push creates deep copies (no reference sharing)', () => {
    const a = makeParams();
    useHistoryStore.getState().init(a);

    const b = makeParams({ contrast: 2.0 });
    useHistoryStore.getState().push(b);

    // Mutate the original object — should not affect the store
    b.contrast = 99;

    const state = useHistoryStore.getState();
    expect(state.present!.contrast).toBe(2.0);
  });

  it('undo returns deep copy (caller mutation is safe)', () => {
    const a = makeParams();
    const b = makeParams({ contrast: 2.0 });

    useHistoryStore.getState().init(a);
    useHistoryStore.getState().push(b);

    const restored = useHistoryStore.getState().undo()!;
    restored.contrast = 99;

    // Store's internal state should be unaffected
    expect(useHistoryStore.getState().present!.contrast).toBe(1.0);
  });
});
