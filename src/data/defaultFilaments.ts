/**
 * Default Filament Database — Pre-calibrated popular filaments
 *
 * TD values sourced from:
 *  - PIXEstL calibrated HSL palette measurements (gaugo87/PIXEstL)
 *  - HueForge community TD database
 *  - Manufacturer spec sheets (where available)
 *
 * TD (Transmission Distance) = thickness in mm at which the filament
 * becomes effectively opaque. Higher = more translucent.
 *
 * Priority: Bambu Lab filaments (most common for AMS multi-colour printing)
 */

import { type Filament } from '../models/filamentPalette';

// ─── Bambu Lab PLA Basic ─────────────────────────────────────────────────────

const BAMBU_PLA_BASIC: Filament[] = [
  {
    id: 'bambu-pla-basic-white',
    name: 'White',
    hexColor: '#FFFFFF',
    td: 4.0,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-black',
    name: 'Black',
    hexColor: '#000000',
    td: 0.4,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-cyan',
    name: 'Cyan',
    hexColor: '#0086D6',
    td: 1.8,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-magenta',
    name: 'Magenta',
    hexColor: '#EC008C',
    td: 1.5,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-yellow',
    name: 'Yellow',
    hexColor: '#FCE300',
    td: 2.2,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-red',
    name: 'Red',
    hexColor: '#E50012',
    td: 1.2,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-green',
    name: 'Green',
    hexColor: '#009A44',
    td: 1.6,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-blue',
    name: 'Blue',
    hexColor: '#003DA5',
    td: 1.3,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-orange',
    name: 'Orange',
    hexColor: '#FF6600',
    td: 1.7,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-purple',
    name: 'Purple',
    hexColor: '#6E3FA3',
    td: 1.4,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-beige',
    name: 'Beige',
    hexColor: '#E7CEB5',
    td: 3.0,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-basic-silver',
    name: 'Silver',
    hexColor: '#A6A9AA',
    td: 2.0,
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    isCalibrated: true,
  },
];

// ─── Bambu Lab PLA Matte ─────────────────────────────────────────────────────

const BAMBU_PLA_MATTE: Filament[] = [
  {
    id: 'bambu-pla-matte-white',
    name: 'Matte White',
    hexColor: '#F0F0F0',
    td: 3.2,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-matte-ice-blue',
    name: 'Matte Ice Blue',
    hexColor: '#8BD5EE',
    td: 2.5,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-matte-sakura-pink',
    name: 'Matte Sakura Pink',
    hexColor: '#E4BDD0',
    td: 2.8,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-matte-latte-brown',
    name: 'Matte Latte Brown',
    hexColor: '#D3B7A7',
    td: 2.3,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-matte-charcoal',
    name: 'Matte Charcoal',
    hexColor: '#4A4A4A',
    td: 0.8,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
  {
    id: 'bambu-pla-matte-lilac-purple',
    name: 'Matte Lilac Purple',
    hexColor: '#B39DDB',
    td: 2.0,
    brand: 'Bambu Lab',
    material: 'PLA Matte',
    isCalibrated: true,
  },
];

// ─── Polymaker (common budget alternative) ───────────────────────────────────

const POLYMAKER: Filament[] = [
  {
    id: 'polymaker-polyterra-white',
    name: 'PolyTerra White',
    hexColor: '#FAFAFA',
    td: 3.8,
    brand: 'Polymaker',
    material: 'PolyTerra PLA',
    isCalibrated: false,
  },
  {
    id: 'polymaker-polyterra-black',
    name: 'PolyTerra Black',
    hexColor: '#1A1A1A',
    td: 0.5,
    brand: 'Polymaker',
    material: 'PolyTerra PLA',
    isCalibrated: false,
  },
  {
    id: 'polymaker-polyterra-army-red',
    name: 'PolyTerra Army Red',
    hexColor: '#CC3333',
    td: 1.3,
    brand: 'Polymaker',
    material: 'PolyTerra PLA',
    isCalibrated: false,
  },
  {
    id: 'polymaker-polyterra-fossil-grey',
    name: 'PolyTerra Fossil Grey',
    hexColor: '#8C8C8C',
    td: 2.2,
    brand: 'Polymaker',
    material: 'PolyTerra PLA',
    isCalibrated: false,
  },
];

// ─── Combined Database ───────────────────────────────────────────────────────

/** All pre-calibrated filaments, grouped by brand */
export const DEFAULT_FILAMENTS: Filament[] = [
  ...BAMBU_PLA_BASIC,
  ...BAMBU_PLA_MATTE,
  ...POLYMAKER,
];

/** Quick lookup by ID */
export const FILAMENT_BY_ID = new Map(
  DEFAULT_FILAMENTS.map(f => [f.id, f])
);

/** Get filaments filtered by brand */
export function getFilamentsByBrand(brand: string): Filament[] {
  return DEFAULT_FILAMENTS.filter(f => f.brand === brand);
}

/** Get filaments filtered by material */
export function getFilamentsByMaterial(material: string): Filament[] {
  return DEFAULT_FILAMENTS.filter(f => f.material === material);
}

/** Get unique brand names */
export function getAvailableBrands(): string[] {
  return [...new Set(DEFAULT_FILAMENTS.map(f => f.brand))];
}

/** Get unique material types */
export function getAvailableMaterials(): string[] {
  return [...new Set(DEFAULT_FILAMENTS.map(f => f.material))];
}

/**
 * Default CMYW filaments for the classic 4-slot AMS setup.
 * White base + Cyan/Magenta/Yellow colour layers.
 */
export function getDefaultCmywFilaments(): Filament[] {
  return [
    FILAMENT_BY_ID.get('bambu-pla-basic-white')!,
    FILAMENT_BY_ID.get('bambu-pla-basic-cyan')!,
    FILAMENT_BY_ID.get('bambu-pla-basic-magenta')!,
    FILAMENT_BY_ID.get('bambu-pla-basic-yellow')!,
  ];
}
