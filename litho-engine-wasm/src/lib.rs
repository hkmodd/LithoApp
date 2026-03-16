mod types;
mod heightmap;
mod mesh;
mod indices;
mod hanger;

use wasm_bindgen::prelude::*;
use js_sys::Function;
use std::f64::consts::PI;

use types::{GridInfo, LithoParams, LithoShape};

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
/// A JS object `{ positions: Float32Array, indices: Uint32Array, uvs: Float32Array, stats: {...} }`
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

    // Step 4: Smoothing
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(40), &JsValue::from("Applying Laplacian smoothing..."));
    heightmap::apply_smoothing(&mut heights, &gi, &params, &mask, &is_frame, progress_fn);

    // Step 5: Mesh generation
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(60), &JsValue::from("Generating 3D geometry..."));

    let hanger_vert_count = hanger::hanger_vertex_count(&params);
    let vr = mesh::generate_vertices(&heights, &gi, &params, &mask, hanger_vert_count);
    let mut positions = vr.positions;
    let mut uvs = vr.uvs;

    // Step 6: Indices
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(80), &JsValue::from("Tessellating surfaces..."));
    let effective_angle_rad = match params.shape {
        LithoShape::Cylinder => 2.0 * PI,
        LithoShape::Arc => params.curve_angle * PI / 180.0,
        _ => 0.0,
    };
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
            vr.max_top_x,
            vr.max_top_y,
            vr.max_top_z,
            gi.physical_width,
            gi.physical_height,
            effective_angle_rad,
        );
        idx.extend_from_slice(&hanger_idx);
    }

    // Step 8: Bounding box
    let _ = progress_fn.call2(&JsValue::NULL, &JsValue::from(95), &JsValue::from("Computing bounding box..."));

    let mut min_x = f32::INFINITY;
    let mut max_x = f32::NEG_INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_y = f32::NEG_INFINITY;
    let mut min_z = f32::INFINITY;
    let mut max_z = f32::NEG_INFINITY;

    let total_grid = gi.grid_w * gi.grid_h;
    for i in (0..positions.len()).step_by(3) {
        let vert_idx = i / 3;
        // For heart, skip masked-out vertices
        if params.shape == LithoShape::Heart {
            if vert_idx < total_grid {
                let gx = vert_idx % gi.grid_w;
                let gy = vert_idx / gi.grid_w;
                if mask[gy * gi.grid_w + gx] == 0 {
                    continue;
                }
            } else if vert_idx < total_grid * 2 {
                let bi = vert_idx - total_grid;
                let gx = bi % gi.grid_w;
                let gy = bi / gi.grid_w;
                if mask[gy * gi.grid_w + gx] == 0 {
                    continue;
                }
            }
        }
        let x = positions[i];
        let y = positions[i + 1];
        let z = positions[i + 2];
        if x < min_x { min_x = x; }
        if x > max_x { max_x = x; }
        if y < min_y { min_y = y; }
        if y > max_y { max_y = y; }
        if z < min_z { min_z = z; }
        if z > max_z { max_z = z; }
    }

    // Build result as JS object
    let num_vertices = gi.grid_w * gi.grid_h * 2 + hanger_vert_count;
    let result = js_sys::Object::new();

    // Convert to typed arrays
    let pos_arr = js_sys::Float32Array::from(positions.as_slice());
    let idx_u32: Vec<u32> = idx;
    let idx_arr = js_sys::Uint32Array::from(idx_u32.as_slice());
    let uv_arr = js_sys::Float32Array::from(uvs.as_slice());

    js_sys::Reflect::set(&result, &"positions".into(), &pos_arr)?;
    js_sys::Reflect::set(&result, &"indices".into(), &idx_arr)?;
    js_sys::Reflect::set(&result, &"uvs".into(), &uv_arr)?;

    // Stats
    let stats = js_sys::Object::new();
    js_sys::Reflect::set(&stats, &"vertices".into(), &JsValue::from(num_vertices as u32))?;
    js_sys::Reflect::set(&stats, &"triangles".into(), &JsValue::from((idx_u32.len() / 3) as u32))?;
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
