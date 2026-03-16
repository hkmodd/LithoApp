use serde::Deserialize;

/// Mirrors the TypeScript `LithoShape` type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LithoShape {
    Flat,
    Arc,
    Cylinder,
    Sphere,
    Heart,
    Dome,
    Lampshade,
    Vase,
}

/// Mirrors the TypeScript `LithoParams` interface.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LithoParams {
    pub shape: LithoShape,
    pub resolution: f64,
    pub physical_size: f64,
    pub base_thickness: f64,
    pub max_thickness: f64,
    pub border_width: f64,
    pub frame_thickness: f64,
    pub base_stand: f64,
    pub curve_angle: f64,
    pub smoothing: u32,
    pub contrast: f64,
    pub brightness: f64,
    pub sharpness: f64,
    pub invert: bool,
    pub hanger: bool,
    pub threshold: u32,
}

/// Grid metadata computed once and shared across pipeline stages.
pub struct GridInfo {
    pub grid_w: usize,
    pub grid_h: usize,
    pub physical_scale: f64,
    pub physical_width: f64,
    pub physical_height: f64,
    pub border_px_x: usize,
    pub border_px_y: usize,
    pub base_stand_px_y: usize,
    pub scale: f64,
}

impl GridInfo {
    pub fn from_params(width: u32, height: u32, params: &LithoParams) -> Self {
        let w = width as f64;
        let h = height as f64;
        let scale = (params.resolution / w.max(h)).min(1.0);
        let grid_w = (w * scale).floor() as usize;
        let grid_h = (h * scale).floor() as usize;

        let physical_scale = params.physical_size / (grid_w.max(grid_h) as f64);
        let physical_width = grid_w as f64 * physical_scale;
        let physical_height = grid_h as f64 * physical_scale;

        let border_px_x = (params.border_width / physical_scale).round() as usize;
        let border_px_y = (params.border_width / physical_scale).round() as usize;
        let base_stand_px_y = if params.base_stand > 0.0 {
            border_px_y.max((5.0 / physical_scale).round() as usize)
        } else {
            0
        };

        Self {
            grid_w,
            grid_h,
            physical_scale,
            physical_width,
            physical_height,
            border_px_x,
            border_px_y,
            base_stand_px_y,
            scale,
        }
    }
}
