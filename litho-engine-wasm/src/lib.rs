mod types;
mod heightmap;
mod mesh;
mod indices;
mod hanger;
mod normals;
mod stl;

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
