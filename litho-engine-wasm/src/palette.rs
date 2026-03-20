/// Palette Engine — Combination generation, pixel matching, thickness extraction
///
/// Given filament slots + print config, builds the full achievable palette,
/// matches image pixels to nearest colors via CIEDE2000, then extracts
/// per-filament greyscale thickness maps.
///
/// This runs entirely in WASM for 10-50× speedup over the JS implementation.

use serde::Deserialize;
use std::collections::HashMap;

use crate::color_science::{
    delta_e_2000, hex_to_rgb, predict_stack_color, rgb_to_lab, Lab, Rgb,
};

// ── Serde types (from JS PrintConfig) ────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilamentDef {
    pub id: String,
    pub name: String,
    pub hex_color: String,
    pub td: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmsSlotDef {
    pub slot: u32,
    pub filament: FilamentDef,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintConfigDef {
    pub slots: Vec<AmsSlotDef>,
    pub max_layers: u32,
    pub layer_height: f64,
    pub base_filament: FilamentDef,
}

// ── Achievable palette entry ─────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AchievableEntry {
    pub combo_key: String,
    /// For each slot (including base at index 0), how many layers
    pub layer_counts: Vec<u32>,
    pub predicted_rgb: Rgb,
    pub predicted_lab: Lab,
}

// ── Partition generation ─────────────────────────────────────────────────────

/// Generate all partitions of `total` layers across `slot_count` filaments.
fn generate_partitions(total: u32, slot_count: usize) -> Vec<Vec<u32>> {
    let mut results = Vec::new();
    let mut current = Vec::with_capacity(slot_count);

    fn recurse(
        remaining: u32,
        slot_idx: usize,
        slot_count: usize,
        current: &mut Vec<u32>,
        results: &mut Vec<Vec<u32>>,
    ) {
        if slot_idx == slot_count - 1 {
            current.push(remaining);
            results.push(current.clone());
            current.pop();
            return;
        }
        for i in 0..=remaining {
            current.push(i);
            recurse(remaining - i, slot_idx + 1, slot_count, current, results);
            current.pop();
        }
    }

    if slot_count == 0 {
        return results;
    }

    recurse(total, 0, slot_count, &mut current, &mut results);
    results
}

/// Generate all partitions for layer counts 0..=max_layers.
fn generate_all_partitions(max_layers: u32, slot_count: usize) -> Vec<Vec<u32>> {
    let mut all = Vec::new();
    for total in 0..=max_layers {
        all.extend(generate_partitions(total, slot_count));
    }
    all
}

// ── Palette building ─────────────────────────────────────────────────────────

/// Build the complete achievable colour palette.
///
/// For each partition of layers across filament slots, simulates Beer-Lambert
/// transmission and predicts the resulting colour. Deduplicates by ΔE2000.
pub fn build_achievable_palette(
    config: &PrintConfigDef,
    dedupe_threshold: f64,
) -> Vec<AchievableEntry> {
    let slot_count = config.slots.len();
    let partitions = generate_all_partitions(config.max_layers, slot_count);

    let base_rgb = hex_to_rgb(&config.base_filament.hex_color);
    let base_td = config.base_filament.td;
    let base_initial = config
        .base_filament
        .name
        .chars()
        .next()
        .unwrap_or('B')
        .to_uppercase()
        .next()
        .unwrap_or('B');

    // Pre-parse slot filament colors
    let slot_rgbs: Vec<Rgb> = config
        .slots
        .iter()
        .map(|s| hex_to_rgb(&s.filament.hex_color))
        .collect();
    let slot_tds: Vec<f64> = config.slots.iter().map(|s| s.filament.td).collect();
    let slot_initials: Vec<char> = config
        .slots
        .iter()
        .map(|s| {
            s.filament
                .name
                .chars()
                .next()
                .unwrap_or('?')
                .to_uppercase()
                .next()
                .unwrap_or('?')
        })
        .collect();

    let mut candidates: Vec<AchievableEntry> = Vec::with_capacity(partitions.len());

    for partition in &partitions {
        let total_color: u32 = partition.iter().sum();
        let base_layers = config.max_layers - total_color;

        // Build layer stack
        let mut layers: Vec<(Rgb, f64, f64)> = Vec::new();

        if base_layers > 0 {
            layers.push((
                base_rgb,
                base_td,
                base_layers as f64 * config.layer_height,
            ));
        }

        for (i, &count) in partition.iter().enumerate() {
            if count > 0 {
                layers.push((
                    slot_rgbs[i],
                    slot_tds[i],
                    count as f64 * config.layer_height,
                ));
            }
        }

        let predicted_rgb = predict_stack_color(&layers);
        let predicted_lab = rgb_to_lab(predicted_rgb.r, predicted_rgb.g, predicted_rgb.b);

        // Build combo key
        let mut key_parts: Vec<String> = Vec::new();
        if base_layers > 0 {
            key_parts.push(format!("{}{}", base_layers, base_initial));
        }
        for (i, &count) in partition.iter().enumerate() {
            if count > 0 {
                key_parts.push(format!("{}{}", count, slot_initials[i]));
            }
        }
        let combo_key = if key_parts.is_empty() {
            "0".to_string()
        } else {
            key_parts.join("-")
        };

        // layer_counts: [base, slot0, slot1, ...]
        let mut layer_counts = vec![base_layers];
        layer_counts.extend_from_slice(partition);

        candidates.push(AchievableEntry {
            combo_key,
            layer_counts,
            predicted_rgb,
            predicted_lab,
        });
    }

    // Deduplicate: keep entries where ΔE ≥ threshold from all kept entries
    let mut palette: Vec<AchievableEntry> = Vec::new();
    for candidate in candidates {
        let is_duplicate = palette.iter().any(|existing| {
            delta_e_2000(&existing.predicted_lab, &candidate.predicted_lab) < dedupe_threshold
        });
        if !is_duplicate {
            palette.push(candidate);
        }
    }

    // Sort by lightness (L*) — brightest first
    palette.sort_by(|a, b| {
        b.predicted_lab
            .l
            .partial_cmp(&a.predicted_lab.l)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    palette
}

// ── Pixel matching ───────────────────────────────────────────────────────────

/// Match result for full image
pub struct ImageMatchResult {
    /// Index into palette for each pixel (row-major)
    pub matches: Vec<u16>,
    /// ΔE error for each pixel
    pub errors: Vec<f32>,
    /// Stats
    pub avg_delta_e: f64,
    pub max_delta_e: f64,
    pub good_match_percent: f64,
    pub used_colors: usize,
}

/// Match all pixels of an RGBA image to the nearest palette entry.
///
/// Uses a Lab cache to avoid repeated RGB→Lab conversions for duplicate colors.
pub fn match_pixels(
    rgba: &[u8],
    width: u32,
    height: u32,
    palette: &[AchievableEntry],
) -> ImageMatchResult {
    let total_pixels = (width * height) as usize;
    let mut matches = vec![0u16; total_pixels];
    let mut errors = vec![0.0f32; total_pixels];

    // Lab cache for unique RGB values
    let mut lab_cache: HashMap<u32, Lab> = HashMap::with_capacity(4096);

    let mut total_de: f64 = 0.0;
    let mut max_de: f64 = 0.0;
    let mut good_count: usize = 0;
    let mut used_set = vec![false; palette.len()];

    for i in 0..total_pixels {
        let offset = i * 4;
        let r = rgba[offset];
        let g = rgba[offset + 1];
        let b = rgba[offset + 2];

        let key = (r as u32) << 16 | (g as u32) << 8 | b as u32;

        let lab = lab_cache
            .entry(key)
            .or_insert_with(|| rgb_to_lab(r, g, b));

        // Find nearest palette entry
        let mut best_idx = 0u16;
        let mut best_dist = f64::INFINITY;

        for (pi, entry) in palette.iter().enumerate() {
            let dist = delta_e_2000(lab, &entry.predicted_lab);
            if dist < best_dist {
                best_dist = dist;
                best_idx = pi as u16;
                if dist < 0.5 {
                    break; // early exit for near-perfect match
                }
            }
        }

        matches[i] = best_idx;
        errors[i] = best_dist as f32;
        used_set[best_idx as usize] = true;

        total_de += best_dist;
        if best_dist > max_de {
            max_de = best_dist;
        }
        if best_dist < 5.0 {
            good_count += 1;
        }
    }

    let used_colors = used_set.iter().filter(|&&x| x).count();

    ImageMatchResult {
        matches,
        errors,
        avg_delta_e: if total_pixels > 0 {
            total_de / total_pixels as f64
        } else {
            0.0
        },
        max_delta_e: max_de,
        good_match_percent: if total_pixels > 0 {
            (good_count as f64 / total_pixels as f64) * 100.0
        } else {
            0.0
        },
        used_colors,
    }
}

// ── Thickness extraction ─────────────────────────────────────────────────────

/// Extract a greyscale thickness map for one specific filament slot.
///
/// For each pixel, looks up how many layers of this filament are assigned in
/// the winning combination, then maps to greyscale:
///   layerCount / maxLayers → fraction
///   grey = (1 - fraction) * 255  (dark = thick, WASM convention)
///
/// Returns RGBA pixel data (greyscale replicated across R/G/B, A=255).
pub fn extract_thickness_map(
    match_result: &ImageMatchResult,
    palette: &[AchievableEntry],
    filament_index: usize, // 0 = base, 1+ = color slots
    max_layers: u32,
    width: u32,
    height: u32,
) -> Vec<u8> {
    let total_pixels = (width * height) as usize;
    let mut out = vec![0u8; total_pixels * 4];

    for i in 0..total_pixels {
        let palette_idx = match_result.matches[i] as usize;
        let entry = &palette[palette_idx];

        let layer_count = if filament_index < entry.layer_counts.len() {
            entry.layer_counts[filament_index]
        } else {
            0
        };

        let fraction = if max_layers > 0 {
            layer_count as f64 / max_layers as f64
        } else {
            0.0
        };

        let grey = ((1.0 - fraction) * 255.0).round() as u8;

        let offset = i * 4;
        out[offset] = grey;
        out[offset + 1] = grey;
        out[offset + 2] = grey;
        out[offset + 3] = 255;
    }

    out
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_config() -> PrintConfigDef {
        PrintConfigDef {
            slots: vec![
                AmsSlotDef {
                    slot: 1,
                    filament: FilamentDef {
                        id: "cyan-1".into(),
                        name: "Cyan".into(),
                        hex_color: "#00AADD".into(),
                        td: 2.0,
                    },
                },
                AmsSlotDef {
                    slot: 2,
                    filament: FilamentDef {
                        id: "magenta-1".into(),
                        name: "Magenta".into(),
                        hex_color: "#DD00AA".into(),
                        td: 2.0,
                    },
                },
            ],
            max_layers: 3,
            layer_height: 0.1,
            base_filament: FilamentDef {
                id: "white-1".into(),
                name: "White".into(),
                hex_color: "#FFFFFF".into(),
                td: 5.0,
            },
        }
    }

    #[test]
    fn partitions_basic() {
        let parts = generate_partitions(3, 2);
        // For 3 across 2 slots: (0,3), (1,2), (2,1), (3,0) = 4 combos
        assert_eq!(parts.len(), 4);
        for p in &parts {
            assert_eq!(p.iter().sum::<u32>(), 3);
        }
    }

    #[test]
    fn build_palette_non_empty() {
        let config = make_config();
        let palette = build_achievable_palette(&config, 1.0);
        assert!(!palette.is_empty());
        // Should contain at least one near-white entry (base only)
        assert!(palette.iter().any(|e| e.predicted_lab.l > 90.0));
    }

    #[test]
    fn match_single_pixel() {
        let config = make_config();
        let palette = build_achievable_palette(&config, 1.0);
        // Match a white pixel
        let rgba = [255u8, 255, 255, 255];
        let result = match_pixels(&rgba, 1, 1, &palette);
        assert_eq!(result.matches.len(), 1);
        // White pixel should match to a bright palette entry with low error
        assert!(result.avg_delta_e < 20.0);
    }

    #[test]
    fn thickness_map_dimensions() {
        let config = make_config();
        let palette = build_achievable_palette(&config, 1.0);
        let rgba = [128u8, 128, 128, 255, 200, 200, 200, 255];
        let result = match_pixels(&rgba, 2, 1, &palette);
        let map = extract_thickness_map(&result, &palette, 0, config.max_layers, 2, 1);
        assert_eq!(map.len(), 2 * 4); // 2 pixels × 4 channels
    }
}
