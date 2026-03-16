// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './useProjectStore';
import { useAppStore } from './useAppStore';

// Reset stores before each test
beforeEach(() => {
  localStorage.clear();

  // Reset app store
  const store = useAppStore.getState();
  store.resetLithoParams();
  store.setMode('lithophane');
  store.setImage(null, null);

  // Reset project store
  useProjectStore.setState({
    isDirty: false,
    lastSavedAt: null,
    autoSaveEnabled: true,
  });
});

describe('useProjectStore', () => {
  it('starts clean', () => {
    const state = useProjectStore.getState();
    expect(state.isDirty).toBe(false);
    expect(state.lastSavedAt).toBeNull();
    expect(state.autoSaveEnabled).toBe(true);
  });

  it('markDirty sets isDirty to true', () => {
    useProjectStore.getState().markDirty();
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('saveToLocal writes to localStorage and clears dirty', () => {
    useProjectStore.getState().markDirty();
    expect(useProjectStore.getState().isDirty).toBe(true);

    useProjectStore.getState().saveToLocal();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().lastSavedAt).not.toBeNull();

    const raw = localStorage.getItem('lithoapp-project');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
  });

  it('loadFromLocal returns false when nothing saved', () => {
    const result = useProjectStore.getState().loadFromLocal();
    expect(result).toBe(false);
  });

  it('save then load round-trips lithoParams', () => {
    // Modify params
    useAppStore.getState().updateLithoParams({ contrast: 2.5, brightness: -0.3 });

    // Save
    useProjectStore.getState().saveToLocal();

    // Reset params
    useAppStore.getState().updateLithoParams({ contrast: 1.0, brightness: 0.0 });

    // Load
    const result = useProjectStore.getState().loadFromLocal();
    expect(result).toBe(true);

    const { lithoParams } = useAppStore.getState();
    expect(lithoParams.contrast).toBe(2.5);
    expect(lithoParams.brightness).toBe(-0.3);
  });

  it('save then load round-trips mode', () => {
    useAppStore.getState().setMode('extrusion');
    useProjectStore.getState().saveToLocal();

    useAppStore.getState().setMode('lithophane');
    useProjectStore.getState().loadFromLocal();

    expect(useAppStore.getState().mode).toBe('extrusion');
  });

  it('clearLocal removes storage and resets state', () => {
    useProjectStore.getState().saveToLocal();
    expect(localStorage.getItem('lithoapp-project')).not.toBeNull();

    useProjectStore.getState().clearLocal();
    expect(localStorage.getItem('lithoapp-project')).toBeNull();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().lastSavedAt).toBeNull();
  });

  it('loadFromLocal returns false for invalid JSON', () => {
    localStorage.setItem('lithoapp-project', '{not valid json');
    const result = useProjectStore.getState().loadFromLocal();
    expect(result).toBe(false);
  });

  it('loadFromLocal returns false for wrong version', () => {
    const bad = { version: 999, savedAt: '', mode: 'lithophane', lithoParams: {} };
    localStorage.setItem('lithoapp-project', JSON.stringify(bad));
    const result = useProjectStore.getState().loadFromLocal();
    expect(result).toBe(false);
  });

  it('toggleAutoSave flips the flag', () => {
    expect(useProjectStore.getState().autoSaveEnabled).toBe(true);
    useProjectStore.getState().toggleAutoSave();
    expect(useProjectStore.getState().autoSaveEnabled).toBe(false);
    useProjectStore.getState().toggleAutoSave();
    expect(useProjectStore.getState().autoSaveEnabled).toBe(true);
  });

  it('importFromFile accepts valid project JSON', async () => {
    const project = {
      version: 1,
      savedAt: new Date().toISOString(),
      mode: 'extrusion',
      lithoParams: {
        ...useAppStore.getState().lithoParams,
        contrast: 3.0,
      },
      imageSrc: null,
    };
    const file = new File([JSON.stringify(project)], 'test.json', { type: 'application/json' });

    const result = await useProjectStore.getState().importFromFile(file);
    expect(result).toBe(true);
    expect(useAppStore.getState().mode).toBe('extrusion');
    expect(useAppStore.getState().lithoParams.contrast).toBe(3.0);
  });

  it('importFromFile rejects invalid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    const result = await useProjectStore.getState().importFromFile(file);
    expect(result).toBe(false);
  });

  it('importFromFile rejects wrong version', async () => {
    const bad = { version: 99, savedAt: '', mode: 'lithophane', lithoParams: {} };
    const file = new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' });
    const result = await useProjectStore.getState().importFromFile(file);
    expect(result).toBe(false);
  });

  it('exported project has correct structure', () => {
    useAppStore.getState().updateLithoParams({ shape: 'heart', contrast: 2.0 });
    useProjectStore.getState().saveToLocal();

    const raw = localStorage.getItem('lithoapp-project');
    const data = JSON.parse(raw!);
    expect(data.version).toBe(1);
    expect(data.savedAt).toBeTruthy();
    expect(data.mode).toBe('lithophane');
    expect(data.lithoParams.shape).toBe('heart');
    expect(data.lithoParams.contrast).toBe(2.0);
    expect(data.imageSrc).toBeNull();
  });
});
