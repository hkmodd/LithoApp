import { MeshEngineResult, ProgressCallback } from './types';

export function generateLithophane(
  imageData: ImageData,
  width: number,
  height: number,
  params: any,
  postProgress: ProgressCallback
): MeshEngineResult {
  const { shape = 'flat', resolution, physicalSize = 100.0, baseThickness, maxThickness, smoothing, invert, borderWidth, frameThickness = 5.0, curveAngle, contrast = 1.0, brightness = 0.0, baseStand = 0.0, sharpness = 0.0, hanger = false } = params;

  postProgress(5, 'Initializing grid...');

  // 1. Downscale/Sample image based on resolution
  const scale = Math.min(1.0, resolution / Math.max(width, height));
  const gridW = Math.floor(width * scale);
  const gridH = Math.floor(height * scale);

  // Physical dimensions (scale X/Y to match max dimension)
  const physicalScale = physicalSize / Math.max(gridW, gridH);
  const physicalWidth = gridW * physicalScale;
  const physicalHeight = gridH * physicalScale;
  
  // Calculate border in pixels
  const borderPxX = Math.round(borderWidth / physicalScale);
  const borderPxY = Math.round(borderWidth / physicalScale);
  const baseStandPxY = baseStand > 0 ? Math.max(borderPxY, Math.round(5.0 / physicalScale)) : 0;

  const mask = new Uint8Array(gridW * gridH);
  const isFrame = new Uint8Array(gridW * gridH);

  if (shape === 'heart') {
    postProgress(10, 'Generating heart mask...');
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const nx = (x / (gridW - 1)) * 2.4 - 1.2;
        const ny = -((y / (gridH - 1)) * 2.2 - 1.1) + 0.1;
        const eq = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
        if (eq <= 0) {
          mask[y * gridW + x] = 1;
        }
      }
    }
    
    // Calculate frame (erosion)
    const radiusSq = Math.max(borderPxX, borderPxY) * Math.max(borderPxX, borderPxY);
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (mask[y * gridW + x] === 1) {
          let isBorder = false;
          for (let dy = -borderPxY; dy <= borderPxY; dy++) {
            for (let dx = -borderPxX; dx <= borderPxX; dx++) {
              if (dx * dx + dy * dy <= radiusSq) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny < 0 || ny >= gridH || nx < 0 || nx >= gridW || mask[ny * gridW + nx] === 0) {
                  isBorder = true;
                  break;
                }
              }
            }
            if (isBorder) break;
          }
          if (isBorder) {
            isFrame[y * gridW + x] = 1;
          }
        }
      }
    }
  } else {
    mask.fill(1);
  }

  postProgress(15, 'Sampling luminance...');

  // Create heightmap
  let heights = new Float32Array(gridW * gridH);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      
      if (shape === 'heart') {
        if (mask[idx] === 0) {
          heights[idx] = 0;
          continue;
        }
        if (isFrame[idx] === 1) {
          heights[idx] = frameThickness;
          continue;
        }
      } else {
        // Check if pixel is within the border frame or base stand
        if (x < borderPxX || x >= gridW - borderPxX || y < borderPxY || y >= gridH - Math.max(borderPxY, baseStandPxY)) {
          let currentMax = frameThickness;
          // If it's the bottom border/stand, we can extend it
          if (y >= gridH - Math.max(borderPxY, baseStandPxY) && baseStand > frameThickness) {
            currentMax = baseStand;
          }
          heights[idx] = currentMax;
          continue;
        }
      }

      // Sample original image
      const origX = Math.floor(x / scale);
      const origY = Math.floor(y / scale);
      const imgIdx = (origY * width + origX) * 4;
      const r = imageData.data[imgIdx];
      const g = imageData.data[imgIdx + 1];
      const b = imageData.data[imgIdx + 2];
      
      // Luminance (0.0 to 1.0)
      let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
      
      // Apply Contrast and Brightness
      lum = (lum - 0.5) * contrast + 0.5 + brightness;
      lum = Math.max(0.0, Math.min(1.0, lum)); // Clamp between 0 and 1
      
      // Lithophane: darker = thicker (usually), but allow inversion
      let normalizedThick = invert ? lum : (1.0 - lum);
      heights[y * gridW + x] = baseThickness + normalizedThick * (maxThickness - baseThickness);
    }
  }

  // Edge Enhancement (Unsharp Masking / Sharpening)
  if (sharpness > 0) {
    postProgress(30, 'Applying Edge Enhancement...');
    let sharpened = new Float32Array(gridW * gridH);
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = y * gridW + x;
        if (x <= 0 || x >= gridW - 1 || y <= 0 || y >= gridH - 1) {
          sharpened[idx] = heights[idx];
          continue;
        }
        if (shape === 'heart' && (mask[idx] === 0 || isFrame[idx] === 1)) {
          sharpened[idx] = heights[idx];
          continue;
        }
        if (shape !== 'heart' && (x <= borderPxX || x >= gridW - borderPxX - 1 || y <= borderPxY || y >= gridH - Math.max(borderPxY, baseStandPxY) - 1)) {
          sharpened[idx] = heights[idx];
          continue;
        }
        
        const center = heights[idx];
        const top = heights[(y - 1) * gridW + x];
        const bottom = heights[(y + 1) * gridW + x];
        const left = heights[y * gridW + x - 1];
        const right = heights[y * gridW + x + 1];
        
        // Simple Laplacian edge detection
        const laplacian = (top + bottom + left + right) - 4 * center;
        
        // Subtract laplacian to sharpen (since our heights are inverted, we might need to add or subtract)
        // Actually, standard sharpen: center + amount * (4*center - top - bottom - left - right)
        // So center - amount * laplacian
        let newH = center - sharpness * laplacian;
        
        // Clamp to base and max thickness
        newH = Math.max(baseThickness, Math.min(maxThickness, newH));
        sharpened[y * gridW + x] = newH;
      }
    }
    heights = sharpened;
  }

  postProgress(40, 'Applying Laplacian smoothing...');

  // Laplacian Smoothing (Ping-Pong Buffer Optimization)
  if (smoothing > 0) {
    let heightsA = heights;
    let heightsB = new Float32Array(gridW * gridH);
    for (let iter = 0; iter < smoothing; iter++) {
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const idx = y * gridW + x;
          if (x <= 0 || x >= gridW - 1 || y <= 0 || y >= gridH - 1) {
            heightsB[idx] = heightsA[idx];
            continue;
          }
          if (shape === 'heart' && (mask[idx] === 0 || isFrame[idx] === 1)) {
            heightsB[idx] = heightsA[idx];
            continue;
          }
          if (shape !== 'heart' && (x <= borderPxX || x >= gridW - borderPxX - 1 || y <= borderPxY || y >= gridH - Math.max(borderPxY, baseStandPxY) - 1)) {
            heightsB[idx] = heightsA[idx];
            continue;
          }
          const sum =
            heightsA[(y - 1) * gridW + x] +
            heightsA[(y + 1) * gridW + x] +
            heightsA[y * gridW + x - 1] +
            heightsA[y * gridW + x + 1];
          heightsB[y * gridW + x] = sum / 4.0;
        }
      }
      // Swap buffers
      let temp = heightsA;
      heightsA = heightsB;
      heightsB = temp;
    }
    heights = heightsA;
  }

  postProgress(60, 'Generating 3D geometry...');

  // Generate Mesh (Top + Bottom + Walls)
  const hangerSegments = 32;
  const hangerVerticesCount = hanger && (shape === 'flat' || shape === 'arc' || shape === 'heart') ? hangerSegments * 4 : 0;
  const numVertices = gridW * gridH * 2 + hangerVerticesCount;
  const positions = new Float32Array(numVertices * 3);
  const uvs = new Float32Array(numVertices * 2);
  const indices = [];

  // Determine effective curve angle based on shape
  let effectiveCurveAngleRad = 0;
  if (shape === 'cylinder') {
    effectiveCurveAngleRad = 2 * Math.PI;
  } else if (shape === 'arc') {
    effectiveCurveAngleRad = ((curveAngle || 0) * Math.PI) / 180.0;
  }

  let maxTopY = -Infinity;
  let maxTopX = 0;
  let maxTopZ = 0;

  // Vertices
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const px_flat = (x - gridW / 2) * physicalScale;
      const py = (gridH / 2 - y) * physicalScale;
      const h_top = heights[y * gridW + x];
      const h_bot = 0;

      let topX, topY, topZ, botX, botY, botZ;

      if (shape === 'sphere') {
        // Spherical projection (with small holes at poles to avoid degenerate triangles)
        const holeAngle = Math.PI / 12; // 15 degrees hole
        const phiRange = Math.PI - 2 * holeAngle;
        const phi = holeAngle + (y / (gridH - 1)) * phiRange;
        const theta = (x / (gridW - 1)) * 2 * Math.PI;
        
        // We want the image to wrap around the sphere.
        // R is chosen to match the physical width (circumference = physicalWidth)
        const R = physicalWidth / (2 * Math.PI);
        
        const r_top = R + h_top;
        const r_bot = R + h_bot;

        // Standard spherical to Cartesian
        topX = r_top * Math.sin(phi) * Math.sin(theta);
        topY = r_top * Math.cos(phi);
        topZ = r_top * Math.sin(phi) * Math.cos(theta);

        botX = r_bot * Math.sin(phi) * Math.sin(theta);
        botY = r_bot * Math.cos(phi);
        botZ = r_bot * Math.sin(phi) * Math.cos(theta);
      } else if (effectiveCurveAngleRad > 0.01) {
        // Curved projection (Arc or Cylinder)
        const R = physicalWidth / effectiveCurveAngleRad;
        const theta = px_flat / R;

        topX = (R + h_top) * Math.sin(theta);
        topY = py;
        topZ = (R + h_top) * Math.cos(theta) - R;

        botX = (R + h_bot) * Math.sin(theta);
        botY = py;
        botZ = (R + h_bot) * Math.cos(theta) - R;
      } else {
        // Flat projection (used for 'flat' and 'heart')
        topX = px_flat;
        topY = py;
        topZ = h_top;

        botX = px_flat;
        botY = py;
        botZ = h_bot;
      }

      // Track max Y for hanger placement
      if (shape === 'heart') {
        if (x === Math.floor(gridW / 2) && mask[y * gridW + x] === 1) {
          if (topY > maxTopY) {
            maxTopY = topY;
            maxTopX = topX;
            maxTopZ = topZ;
          }
        }
      } else {
        if (y === 0 && x === Math.floor(gridW / 2)) {
          maxTopY = topY;
          maxTopX = topX;
          maxTopZ = topZ;
        }
      }

      // Top vertex
      const topIdx = y * gridW + x;
      positions[topIdx * 3] = topX;
      positions[topIdx * 3 + 1] = topY;
      positions[topIdx * 3 + 2] = topZ;
      uvs[topIdx * 2] = x / (gridW - 1);
      uvs[topIdx * 2 + 1] = 1.0 - (y / (gridH - 1));

      // Bottom vertex
      const botIdx = gridW * gridH + topIdx;
      positions[botIdx * 3] = botX;
      positions[botIdx * 3 + 1] = botY;
      positions[botIdx * 3 + 2] = botZ;
      uvs[botIdx * 2] = x / (gridW - 1);
      uvs[botIdx * 2 + 1] = 1.0 - (y / (gridH - 1));
    }
  }

  postProgress(80, 'Tessellating surfaces...');

  const isFullCylinder = shape === 'cylinder' || shape === 'sphere' || effectiveCurveAngleRad >= 359.9 * Math.PI / 180.0;

  const isSolid = (x: number, y: number) => {
    if (y < 0 || y >= gridH - 1) return false;
    let checkX = x;
    if (isFullCylinder) {
      checkX = (x + (gridW - 1)) % (gridW - 1);
    } else {
      if (x < 0 || x >= gridW - 1) return false;
    }
    
    if (shape === 'heart') {
      return mask[y * gridW + checkX] === 1 && 
             mask[y * gridW + checkX + 1] === 1 &&
             mask[(y + 1) * gridW + checkX] === 1 && 
             mask[(y + 1) * gridW + checkX + 1] === 1;
    }
    return true;
  };

  // Indices - Top Surface (Normals pointing +Z / outwards)
  for (let y = 0; y < gridH - 1; y++) {
    for (let x = 0; x < gridW - 1; x++) {
      if (!isSolid(x, y)) continue;
      
      const a = y * gridW + x;
      const b = y * gridW + x + 1;
      const c = (y + 1) * gridW + x;
      const d = (y + 1) * gridW + x + 1;
      
      if (isFullCylinder && x === gridW - 2) {
        // Weld last column to first column
        const b_weld = y * gridW + 0;
        const d_weld = (y + 1) * gridW + 0;
        indices.push(a, c, b_weld);
        indices.push(b_weld, c, d_weld);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  // Indices - Bottom Surface (Normals pointing -Z / outwards)
  const offset = gridW * gridH;
  for (let y = 0; y < gridH - 1; y++) {
    for (let x = 0; x < gridW - 1; x++) {
      if (!isSolid(x, y)) continue;
      
      const a = offset + y * gridW + x;
      const b = offset + y * gridW + x + 1;
      const c = offset + (y + 1) * gridW + x;
      const d = offset + (y + 1) * gridW + x + 1;
      
      if (isFullCylinder && x === gridW - 2) {
        // Weld last column to first column
        const b_weld = offset + y * gridW + 0;
        const d_weld = offset + (y + 1) * gridW + 0;
        indices.push(a, b_weld, c);
        indices.push(b_weld, d_weld, c);
      } else {
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  // Walls
  for (let y = -1; y < gridH; y++) {
    for (let x = -1; x < gridW; x++) {
      const current = isSolid(x, y);
      const right = isSolid(x + 1, y);
      const bottom = isSolid(x, y + 1);

      if (current !== right) {
        const edgeX = x + 1;
        if (edgeX >= 0 && edgeX < gridW && y >= 0 && y < gridH - 1) {
          const t1 = y * gridW + edgeX;
          const t2 = (y + 1) * gridW + edgeX;
          const b1 = offset + t1;
          const b2 = offset + t2;
          
          if (current) {
            indices.push(t1, t2, b1);
            indices.push(t2, b2, b1);
          } else {
            indices.push(t1, b1, t2);
            indices.push(t2, b1, b2);
          }
        }
      }

      if (current !== bottom) {
        const edgeY = y + 1;
        if (edgeY >= 0 && edgeY < gridH && x >= 0 && x < gridW - 1) {
          const t1 = edgeY * gridW + x;
          const t2 = edgeY * gridW + x + 1;
          const b1 = offset + t1;
          const b2 = offset + t2;
          
          let realT2 = t2;
          let realB2 = b2;
          if (isFullCylinder && x === gridW - 2) {
            realT2 = edgeY * gridW + 0;
            realB2 = offset + realT2;
          }

          if (current) {
            indices.push(t1, b1, realT2);
            indices.push(realT2, b1, realB2);
          } else {
            indices.push(t1, realT2, b1);
            indices.push(realT2, realB2, b1);
          }
        }
      }
    }
  }

  // Generate Hanger if requested
  if (hangerVerticesCount > 0) {
    postProgress(90, 'Generating hanger...');
    const outerR = 5.0; // 5mm radius
    const innerR = 3.0; // 3mm radius
    const thickness = frameThickness;
    
    // Center of the hanger
    const cx = maxTopX;
    const cy = (maxTopY === -Infinity ? physicalHeight / 2 : maxTopY) + outerR - 1.0; // Overlap by 1mm
    // For flat/arc, Z is just 0 to frameThickness. For arc, we might need to adjust, but 0 is fine for the base.
    let cz = 0;
    if (shape === 'arc') {
      // Adjust Z to match the curve at the top center
      const R = physicalWidth / effectiveCurveAngleRad;
      cz = -R + R; // It's 0 at the center
    } else if (shape === 'heart') {
      // Heart base Z at top center
      cz = maxTopZ - frameThickness; // Approximate
    }

    const hangerOffset = gridW * gridH * 2;
    
    for (let i = 0; i < hangerSegments; i++) {
      const theta = (i / hangerSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      
      const vIdx = hangerOffset + i * 4;
      
      // Top face outer
      positions[(vIdx + 0) * 3] = cx + outerR * cos;
      positions[(vIdx + 0) * 3 + 1] = cy + outerR * sin;
      positions[(vIdx + 0) * 3 + 2] = cz + thickness;
      uvs[(vIdx + 0) * 2] = 0;
      uvs[(vIdx + 0) * 2 + 1] = 0;
      
      // Top face inner
      positions[(vIdx + 1) * 3] = cx + innerR * cos;
      positions[(vIdx + 1) * 3 + 1] = cy + innerR * sin;
      positions[(vIdx + 1) * 3 + 2] = cz + thickness;
      uvs[(vIdx + 1) * 2] = 0;
      uvs[(vIdx + 1) * 2 + 1] = 0;
      
      // Bottom face outer
      positions[(vIdx + 2) * 3] = cx + outerR * cos;
      positions[(vIdx + 2) * 3 + 1] = cy + outerR * sin;
      positions[(vIdx + 2) * 3 + 2] = cz;
      uvs[(vIdx + 2) * 2] = 0;
      uvs[(vIdx + 2) * 2 + 1] = 0;
      
      // Bottom face inner
      positions[(vIdx + 3) * 3] = cx + innerR * cos;
      positions[(vIdx + 3) * 3 + 1] = cy + innerR * sin;
      positions[(vIdx + 3) * 3 + 2] = cz;
      uvs[(vIdx + 3) * 2] = 0;
      uvs[(vIdx + 3) * 2 + 1] = 0;
    }

    // Indices for hanger
    for (let i = 0; i < hangerSegments; i++) {
      const next = (i + 1) % hangerSegments;
      const i4 = hangerOffset + i * 4;
      const n4 = hangerOffset + next * 4;

      // Top face (0, 1)
      indices.push(i4 + 0, i4 + 1, n4 + 0);
      indices.push(n4 + 0, i4 + 1, n4 + 1);

      // Bottom face (2, 3) - winding reversed
      indices.push(i4 + 2, n4 + 2, i4 + 3);
      indices.push(n4 + 2, n4 + 3, i4 + 3);

      // Outer wall (0, 2)
      indices.push(i4 + 0, n4 + 0, i4 + 2);
      indices.push(n4 + 0, n4 + 2, i4 + 2);

      // Inner wall (1, 3) - winding reversed
      indices.push(i4 + 1, i4 + 3, n4 + 1);
      indices.push(n4 + 1, i4 + 3, n4 + 3);
    }
  }

  const indicesArray = new Uint32Array(indices);

  postProgress(95, 'Computing bounding box...');

  // Compute dynamic bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const bbox = { minX, maxX, minY, maxY, minZ, maxZ };

  return {
    positions,
    indices: indicesArray,
    uvs,
    stats: {
      vertices: numVertices,
      triangles: indicesArray.length / 3,
      bbox,
      width: gridW,
      height: gridH
    }
  };
}
