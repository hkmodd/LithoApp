import { describe, it, expect } from 'vitest';
import {
  createFilament,
  validateFilament,
  validatePrintConfig,
  exportFilamentLibrary,
  importFilamentLibrary,
  defaultPrintConfig,
  filamentRgb,
  filamentLab,
  type Filament,
  type PrintConfig,
} from './filamentPalette';
import {
  DEFAULT_FILAMENTS,
  FILAMENT_BY_ID,
  getFilamentsByBrand,
  getAvailableBrands,
  getDefaultCmywFilaments,
} from '../data/defaultFilaments';

// ─── Filament creation ───────────────────────────────────────────────────────

describe('createFilament', () => {
  it('creates a filament with defaults', () => {
    const f = createFilament({ name: 'Test', hexColor: '#FF0000', td: 1.5 });
    expect(f.name).toBe('Test');
    expect(f.hexColor).toBe('#FF0000');
    expect(f.td).toBe(1.5);
    expect(f.brand).toBe('Unknown');
    expect(f.material).toBe('PLA');
    expect(f.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('applies overrides', () => {
    const f = createFilament({
      name: 'Custom',
      hexColor: '#00FF00',
      td: 2.0,
      brand: 'Bambu Lab',
      material: 'PETG',
    });
    expect(f.brand).toBe('Bambu Lab');
    expect(f.material).toBe('PETG');
  });
});

// ─── Filament utilities ──────────────────────────────────────────────────────

describe('filament utilities', () => {
  const f = createFilament({ name: 'Cyan', hexColor: '#0086D6', td: 1.8 });

  it('filamentRgb extracts RGB', () => {
    const [r, g, b] = filamentRgb(f);
    expect(r).toBe(0);
    expect(g).toBe(0x86);
    expect(b).toBe(0xD6);
  });

  it('filamentLab returns Lab values', () => {
    const [L, a, b] = filamentLab(f);
    expect(L).toBeGreaterThan(40);
    expect(L).toBeLessThan(70);
    expect(a).toBeLessThan(0); // blue-ish = negative a
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('validateFilament', () => {
  it('valid filament returns null', () => {
    const f = createFilament({ name: 'Test', hexColor: '#FF0000', td: 1.5 });
    expect(validateFilament(f)).toBeNull();
  });

  it('empty name is invalid', () => {
    const f = createFilament({ name: '', hexColor: '#FF0000', td: 1.5 });
    expect(validateFilament(f)).toContain('Name');
  });

  it('bad hex is invalid', () => {
    const f = createFilament({ name: 'Test', hexColor: 'red', td: 1.5 });
    expect(validateFilament(f)).toContain('hex');
  });

  it('td <= 0 is invalid', () => {
    const f = createFilament({ name: 'Test', hexColor: '#FF0000', td: 0 });
    expect(validateFilament(f)).toContain('TD');
  });

  it('td > 20 is invalid', () => {
    const f = createFilament({ name: 'Test', hexColor: '#FF0000', td: 25 });
    expect(validateFilament(f)).toContain('TD');
  });
});

describe('validatePrintConfig', () => {
  it('valid config returns null', () => {
    const filaments = getDefaultCmywFilaments();
    const config = defaultPrintConfig(filaments);
    expect(validatePrintConfig(config)).toBeNull();
  });

  it('empty slots is invalid', () => {
    const config: PrintConfig = {
      slots: [],
      maxLayers: 5,
      layerHeight: 0.1,
      baseFilament: createFilament({ name: 'W', hexColor: '#FFFFFF', td: 4 }),
    };
    expect(validatePrintConfig(config)).toContain('slot');
  });
});

// ─── Import / Export ─────────────────────────────────────────────────────────

describe('import / export', () => {
  it('round-trip preserves filaments', () => {
    const original = [
      createFilament({ name: 'A', hexColor: '#FF0000', td: 1.0 }),
      createFilament({ name: 'B', hexColor: '#00FF00', td: 2.0 }),
    ];
    const json = exportFilamentLibrary(original);
    const imported = importFilamentLibrary(json);
    expect(imported).toHaveLength(2);
    expect(imported[0].name).toBe('A');
    expect(imported[1].td).toBe(2.0);
  });

  it('rejects invalid JSON', () => {
    expect(() => importFilamentLibrary('not json')).toThrow();
  });

  it('rejects wrong version', () => {
    expect(() => importFilamentLibrary('{"version":99}')).toThrow(/version/);
  });

  it('rejects filament with invalid data', () => {
    const bad = JSON.stringify({
      version: 1,
      filaments: [{ id: 'x', name: '', hexColor: '#FF0000', td: 1, brand: 'B', material: 'M' }],
    });
    expect(() => importFilamentLibrary(bad)).toThrow(/Name/);
  });
});

// ─── Default Filaments Database ──────────────────────────────────────────────

describe('defaultFilaments', () => {
  it('has at least 20 filaments', () => {
    expect(DEFAULT_FILAMENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('all filaments pass validation', () => {
    for (const f of DEFAULT_FILAMENTS) {
      const err = validateFilament(f);
      expect(err, `${f.name}: ${err}`).toBeNull();
    }
  });

  it('FILAMENT_BY_ID has all entries', () => {
    expect(FILAMENT_BY_ID.size).toBe(DEFAULT_FILAMENTS.length);
  });

  it('getFilamentsByBrand returns only Bambu Lab', () => {
    const bambu = getFilamentsByBrand('Bambu Lab');
    expect(bambu.length).toBeGreaterThan(10);
    expect(bambu.every(f => f.brand === 'Bambu Lab')).toBe(true);
  });

  it('getAvailableBrands includes known brands', () => {
    const brands = getAvailableBrands();
    expect(brands).toContain('Bambu Lab');
    expect(brands).toContain('Polymaker');
  });

  it('getDefaultCmywFilaments returns 4 filaments', () => {
    const cmyw = getDefaultCmywFilaments();
    expect(cmyw).toHaveLength(4);
    expect(cmyw[0].name).toContain('White');
    expect(cmyw[1].name).toContain('Cyan');
    expect(cmyw[2].name).toContain('Magenta');
    expect(cmyw[3].name).toContain('Yellow');
  });
});
