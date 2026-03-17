use serde::Deserialize;

/// Axis-aligned bounding box, accumulated during mesh generation.
#[derive(Debug, Clone, Copy)]
pub struct BBox {
    pub min_x: f32,
    pub max_x: f32,
    pub min_y: f32,
    pub max_y: f32,
    pub min_z: f32,
    pub max_z: f32,
}

impl BBox {
    pub fn empty() -> Self {
        Self {
            min_x: f32::INFINITY,
            max_x: f32::NEG_INFINITY,
            min_y: f32::INFINITY,
            max_y: f32::NEG_INFINITY,
            min_z: f32::INFINITY,
            max_z: f32::NEG_INFINITY,
        }
    }

    #[inline(always)]
    pub fn update(&mut self, x: f32, y: f32, z: f32) {
        if x < self.min_x { self.min_x = x; }
        if x > self.max_x { self.max_x = x; }
        if y < self.min_y { self.min_y = y; }
        if y > self.max_y { self.max_y = y; }
        if z < self.min_z { self.min_z = z; }
        if z > self.max_z { self.max_z = z; }
    }

    #[allow(dead_code)]
    /// Merge another BBox into this one.
    pub fn merge(&mut self, other: &BBox) {
        if other.min_x < self.min_x { self.min_x = other.min_x; }
        if other.max_x > self.max_x { self.max_x = other.max_x; }
        if other.min_y < self.min_y { self.min_y = other.min_y; }
        if other.max_y > self.max_y { self.max_y = other.max_y; }
        if other.min_z < self.min_z { self.min_z = other.min_z; }
        if other.max_z > self.max_z { self.max_z = other.max_z; }
    }
}

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
/// All dimensions in mm, f32 precision (7 significant digits = 0.001mm).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LithoParams {
    pub shape: LithoShape,
    pub resolution: f32,
    pub physical_size: f32,
    pub base_thickness: f32,
    pub max_thickness: f32,
    pub border_width: f32,
    pub frame_thickness: f32,
    pub base_stand: f32,
    pub curve_angle: f32,
    pub smoothing: u32,
    pub contrast: f32,
    pub brightness: f32,
    pub sharpness: f32,
    pub invert: bool,
    pub hanger: bool,
    #[allow(dead_code)]
    pub threshold: u32,
}

/// Grid metadata computed once and shared across pipeline stages.
pub struct GridInfo {
    pub grid_w: usize,
    pub grid_h: usize,
    #[allow(dead_code)]
    pub physical_scale: f32,
    pub physical_width: f32,
    pub physical_height: f32,
    pub border_px_x: usize,
    pub border_px_y: usize,
    pub base_stand_px_y: usize,
    /// Sampling scale — kept as f64 for sub-pixel precision when mapping grid→image.
    pub scale: f64,
}

impl GridInfo {
    pub fn from_params(width: u32, height: u32, params: &LithoParams) -> Self {
        let w = width as f64;
        let h = height as f64;
        let scale = (params.resolution as f64 / w.max(h)).min(1.0);
        let grid_w = (w * scale).floor() as usize;
        let grid_h = (h * scale).floor() as usize;

        let physical_scale = params.physical_size / (grid_w.max(grid_h) as f32);
        let physical_width = grid_w as f32 * physical_scale;
        let physical_height = grid_h as f32 * physical_scale;

        let border_px_x = (params.border_width / physical_scale).round() as usize;
        let border_px_y = (params.border_width / physical_scale).round() as usize;
        let base_stand_px_y = if params.base_stand > 0.0 {
            border_px_y.max((5.0_f32 / physical_scale).round() as usize)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_info_basic() {
        let params = LithoParams {
            shape: LithoShape::Flat,
            resolution: 500.0,
            physical_size: 100.0,
            base_thickness: 0.6,
            max_thickness: 2.5,
            border_width: 2.0,
            frame_thickness: 2.5,
            base_stand: 0.0,
            curve_angle: 120.0,
            smoothing: 3,
            contrast: 1.0,
            brightness: 0.0,
            sharpness: 0.0,
            invert: false,
            hanger: false,
            threshold: 128,
        };
        let gi = GridInfo::from_params(1000, 800, &params);
        assert_eq!(gi.grid_w, 500);
        assert_eq!(gi.grid_h, 400);
        assert!(gi.physical_scale > 0.0);
        assert!(gi.physical_width > 0.0);
        assert!(gi.physical_height > 0.0);
    }

    #[test]
    fn grid_info_small_image() {
        let params = LithoParams {
            shape: LithoShape::Flat,
            resolution: 2000.0,
            physical_size: 100.0,
            base_thickness: 0.6,
            max_thickness: 2.5,
            border_width: 0.0,
            frame_thickness: 2.5,
            base_stand: 0.0,
            curve_angle: 120.0,
            smoothing: 0,
            contrast: 1.0,
            brightness: 0.0,
            sharpness: 0.0,
            invert: false,
            hanger: false,
            threshold: 128,
        };
        // resolution > image size → scale clamped to 1.0
        let gi = GridInfo::from_params(100, 80, &params);
        assert_eq!(gi.grid_w, 100);
        assert_eq!(gi.grid_h, 80);
    }
}
