mod types;
mod heightmap;
mod mesh;
mod indices;
mod hanger;
mod normals;
mod stl;
mod color_science;
mod palette;

use wasm_bindgen::prelude::*;
use js_sys::Function;

use types::{BBox, GridInfo, LithoParams, LithoShape};

/// One-time init: install panic hook for better error messages in DevTools.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Main WASM entry point — called from the JS web worker.
///
/// # Arguments
/// * `pixels`      – Raw RGBA pixel data (Uint8ClampedArray from ImageData)
/// * `width`       – Original image width
/// * `height`      – Original image height
/// * `params_js`   – LithoParams object (JS → serde deserialization)
/// * `progress_fn` – JS callback `(progress: number, message: string) => void`
///
/// # Returns
/// A JS object `{ positions: Float32Array, indices: Uint32Array, uvs: Float32Array, normals: Float32Array, stats: {...} }`
#[wasm_bindgen]
pub fn generate_lithophane(
    pixels: &[u8],
    width: u32,
    height: u32,
    params_js: JsValue,
    progress_fn: &Function,
) -> Result<JsValue, JsValue> {
    // Deserialize params
    let params: LithoParams = serde_wasm_bindgen::from_value(params_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse params: {}", e)))?;

    let gi = GridInfo::from_params(width, height, &params);

    // Progress: 5%
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(5), &JsValue::from("Initializing grid..."));

    // Step 1: Heart masks (only used for heart shape)
    let (mask, is_frame) = if params.shape == LithoShape::Heart {
        let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(10), &JsValue::from("Generating heart mask..."));
        heightmap::build_heart_masks(&gi, &params)
    } else {
        (vec![], vec![])
    };

    // Step 2: Heightmap
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(15), &JsValue::from("Sampling luminance..."));
    let mut heights = heightmap::build_heightmap(pixels, width, &gi, &params, &mask, &is_frame);

    // Step 3: Sharpening
    if params.sharpness > 0.0 {
        let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(30), &JsValue::from("Applying Edge Enhancement..."));
        heightmap::apply_sharpening(&mut heights, &gi, &params, &mask, &is_frame);
    }

    // Step 4: Smoothing (separable 2-pass)
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(40), &JsValue::from("Applying Laplacian smoothing..."));
    heightmap::apply_smoothing(&mut heights, &gi, &params, &mask, &is_frame, progress_fn);

    // Step 5: Mesh generation
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(60), &JsValue::from("Generating 3D geometry..."));

    let hanger_vert_count = hanger::hanger_vertex_count(&params);
    let total_verts = gi.grid_w * gi.grid_h * 2 + hanger_vert_count;
    let mut positions = vec![0.0f32; total_verts * 3];
    let mut uvs = vec![0.0f32; total_verts * 2];

    let mesh_result =
        mesh::generate_mesh_positions(&heights, &gi, &params, &mut positions, &mut uvs);
    let max_top_x = mesh_result.max_top_x;
    let max_top_y = mesh_result.max_top_y;
    let max_top_z = mesh_result.max_top_z;
    let effective_angle_rad = mesh_result.effective_angle_rad;

    // Step 6: Indices
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(80), &JsValue::from("Tessellating surfaces..."));
    let mut idx = indices::generate_indices(&gi, &params, &mask, effective_angle_rad);

    // Step 7: Hanger
    if hanger_vert_count > 0 {
        let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(90), &JsValue::from("Generating hanger..."));
        let hanger_offset = gi.grid_w * gi.grid_h * 2;
        let hanger_idx = hanger::generate_hanger(
            &mut positions,
            &mut uvs,
            hanger_offset,
            &params,
            max_top_x,
            max_top_y,
            max_top_z,
            gi.physical_width,
            gi.physical_height,
            effective_angle_rad,
        );
        idx.extend_from_slice(&hanger_idx);
    }

    // Step 7b: Vertex normals (area-weighted, computed entirely in Rust)
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(92), &JsValue::from("Computing vertex normals..."));
    let normals = normals::compute_vertex_normals(&positions, &idx);

    // Step 8: Bounding box
    // For non-heart shapes, bbox was already computed inline during mesh generation.
    // For heart shapes, we need to re-scan only masked-in vertices.
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(95), &JsValue::from("Computing bounding box..."));

    let (min_x, max_x, min_y, max_y, min_z, max_z) = if params.shape == LithoShape::Heart {
        // Heart: re-compute bbox excluding masked-out vertices
        let total_grid = gi.grid_w * gi.grid_h;
        let mut hbbox = BBox::empty();
        for (vi, chunk) in positions.chunks_exact(3).enumerate() {
            if vi < total_grid {
                let gx = vi % gi.grid_w;
                let gy = vi / gi.grid_w;
                if mask[gy * gi.grid_w + gx] == 0 {
                    continue;
                }
            } else if vi < total_grid * 2 {
                let bi = vi - total_grid;
                let gx = bi % gi.grid_w;
                let gy = bi / gi.grid_w;
                if mask[gy * gi.grid_w + gx] == 0 {
                    continue;
                }
            }
            hbbox.update(chunk[0], chunk[1], chunk[2]);
        }
        (hbbox.min_x, hbbox.max_x, hbbox.min_y, hbbox.max_y, hbbox.min_z, hbbox.max_z)
    } else {
        // All other shapes: use bbox computed inline during mesh generation
        let b = &mesh_result.bbox;
        (b.min_x, b.max_x, b.min_y, b.max_y, b.min_z, b.max_z)
    };

    // Build result as JS object
    let result = js_sys::Object::new();

    let pos_arr = js_sys::Float32Array::from(positions.as_slice());
    let idx_arr = js_sys::Uint32Array::from(idx.as_slice());
    let uv_arr = js_sys::Float32Array::from(uvs.as_slice());
    let nrm_arr = js_sys::Float32Array::from(normals.as_slice());

    js_sys::Reflect::set(&result, &"positions".into(), &pos_arr)?;
    js_sys::Reflect::set(&result, &"indices".into(), &idx_arr)?;
    js_sys::Reflect::set(&result, &"uvs".into(), &uv_arr)?;
    js_sys::Reflect::set(&result, &"normals".into(), &nrm_arr)?;

    // Stats
    let stats = js_sys::Object::new();
    js_sys::Reflect::set(&stats, &"vertices".into(), &JsValue::from(total_verts as u32))?;
    js_sys::Reflect::set(&stats, &"triangles".into(), &JsValue::from((idx.len() / 3) as u32))?;
    js_sys::Reflect::set(&stats, &"width".into(), &JsValue::from(gi.grid_w as u32))?;
    js_sys::Reflect::set(&stats, &"height".into(), &JsValue::from(gi.grid_h as u32))?;

    let bbox = js_sys::Object::new();
    js_sys::Reflect::set(&bbox, &"minX".into(), &JsValue::from(min_x as f64))?;
    js_sys::Reflect::set(&bbox, &"maxX".into(), &JsValue::from(max_x as f64))?;
    js_sys::Reflect::set(&bbox, &"minY".into(), &JsValue::from(min_y as f64))?;
    js_sys::Reflect::set(&bbox, &"maxY".into(), &JsValue::from(max_y as f64))?;
    js_sys::Reflect::set(&bbox, &"minZ".into(), &JsValue::from(min_z as f64))?;
    js_sys::Reflect::set(&bbox, &"maxZ".into(), &JsValue::from(max_z as f64))?;
    js_sys::Reflect::set(&stats, &"bbox".into(), &bbox)?;

    js_sys::Reflect::set(&result, &"stats".into(), &stats)?;

    Ok(result.into())
}

/// Encode positions + indices as binary STL.
///
/// Runs entirely in WASM — no main-thread blocking.
/// Called from the Web Worker via a dedicated message.
#[wasm_bindgen]
pub fn encode_stl(
    positions: &[f32],
    indices: &[u32],
) -> js_sys::Uint8Array {
    let buf = stl::encode_binary_stl(positions, indices);
    js_sys::Uint8Array::from(buf.as_slice())
}

/// Build palette-mode thickness maps entirely in WASM.
///
/// # Arguments
/// * `pixels`        – Raw RGBA pixel data (Uint8ClampedArray from ImageData)
/// * `width`         – Image width in pixels
/// * `height`        – Image height in pixels
/// * `config_js`     – PrintConfig object (JS → serde)
/// * `progress_fn`   – JS callback `(progress: number, message: string) => void`
///
/// # Returns
/// JS object: `{
///   filament_maps: [{ id, name, hex, greyscale: Uint8ClampedArray }],
///   stats: { avgDeltaE, maxDeltaE, goodMatchPercent, usedColors, paletteSize }
/// }`
#[wasm_bindgen]
pub fn build_palette_maps(
    pixels: &[u8],
    width: u32,
    height: u32,
    config_js: JsValue,
    progress_fn: &Function,
) -> Result<JsValue, JsValue> {
    use palette::{
        build_achievable_palette, extract_thickness_map, match_pixels, PrintConfigDef,
    };

    // Parse the PrintConfig
    let config: PrintConfigDef = serde_wasm_bindgen::from_value(config_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse PrintConfig: {}", e)))?;

    // Step 1: Build achievable palette
    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(5),
        &JsValue::from("Building achievable colour palette..."),
    );
    let palette_entries = build_achievable_palette(&config, 1.0);
    let palette_size = palette_entries.len();

    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(10),
        &JsValue::from(format!("Palette: {} achievable colours", palette_size).as_str()),
    );

    // Step 2: Match all pixels
    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(15),
        &JsValue::from("Matching pixels to palette (CIEDE2000)..."),
    );
    let match_result = match_pixels(pixels, width, height, &palette_entries);

    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(50),
        &JsValue::from(
            format!(
                "Match complete: avg ΔE={:.1}, {:.0}% good",
                match_result.avg_delta_e, match_result.good_match_percent
            )
            .as_str(),
        ),
    );

    // Step 3: Extract thickness maps for each filament
    // Index 0 = base filament, 1+ = color slots
    let slot_count = config.slots.len() + 1; // +1 for base
    let filament_maps = js_sys::Array::new();

    for fi in 0..slot_count {
        let (fid, fname, fhex) = if fi == 0 {
            (
                config.base_filament.id.as_str(),
                config.base_filament.name.as_str(),
                config.base_filament.hex_color.as_str(),
            )
        } else {
            let s = &config.slots[fi - 1];
            (
                s.filament.id.as_str(),
                s.filament.name.as_str(),
                s.filament.hex_color.as_str(),
            )
        };

        let progress_pct = 50 + (fi * 40 / slot_count);
        let _ = progress_fn.call2(
            &JsValue::NULL,
            &JsValue::from(progress_pct as u32),
            &JsValue::from(format!("Extracting {} thickness map...", fname).as_str()),
        );

        let greyscale_rgba =
            extract_thickness_map(&match_result, &palette_entries, fi, config.max_layers, width, height);

        // Build entry object
        let entry = js_sys::Object::new();
        js_sys::Reflect::set(&entry, &"id".into(), &JsValue::from(fid))?;
        js_sys::Reflect::set(&entry, &"name".into(), &JsValue::from(fname))?;
        js_sys::Reflect::set(&entry, &"hex".into(), &JsValue::from(fhex))?;
        let gs_arr = js_sys::Uint8ClampedArray::from(greyscale_rgba.as_slice());
        js_sys::Reflect::set(&entry, &"greyscale".into(), &gs_arr)?;

        filament_maps.push(&entry);
    }

    // Build stats
    let stats = js_sys::Object::new();
    js_sys::Reflect::set(&stats, &"avgDeltaE".into(), &JsValue::from(match_result.avg_delta_e))?;
    js_sys::Reflect::set(&stats, &"maxDeltaE".into(), &JsValue::from(match_result.max_delta_e))?;
    js_sys::Reflect::set(
        &stats,
        &"goodMatchPercent".into(),
        &JsValue::from(match_result.good_match_percent),
    )?;
    js_sys::Reflect::set(&stats, &"usedColors".into(), &JsValue::from(match_result.used_colors as u32))?;
    js_sys::Reflect::set(&stats, &"paletteSize".into(), &JsValue::from(palette_size as u32))?;

    // Build result object
    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"filament_maps".into(), &filament_maps)?;
    js_sys::Reflect::set(&result, &"stats".into(), &stats)?;

    let _ = progress_fn.call2(
        &JsValue::NULL,
        &JsValue::from(100),
        &JsValue::from("Palette maps complete"),
    );

    Ok(result.into())
}
