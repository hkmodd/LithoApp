import { LithoParams } from '../store/useAppStore';

export async function generateColorProfile(
  imageUrl: string,
  params: LithoParams
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get 2d context'));

      // Use a high resolution for the output print (e.g., max 2048px)
      const maxDim = 2048;
      let scale = 1.0;
      if (img.width > maxDim || img.height > maxDim) {
        scale = maxDim / Math.max(img.width, img.height);
      }
      
      const outW = Math.floor(img.width * scale);
      const outH = Math.floor(img.height * scale);

      canvas.width = outW;
      canvas.height = outH;

      // 1. Mirror horizontally (since it goes on the back of the lithophane)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // 2. Draw the image
      ctx.drawImage(img, 0, 0, outW, outH);

      // 3. Apply shape mask if needed (Heart)
      if (params.shape === 'heart') {
        const imageData = ctx.getImageData(0, 0, outW, outH);
        const data = imageData.data;
        
        for (let y = 0; y < outH; y++) {
          for (let x = 0; x < outW; x++) {
            // The mask is mirrored because we mirrored the canvas, 
            // but the heart is symmetric so it doesn't matter.
            // We use the exact same mathematical bounds as the 3D engine.
            const nx = (x / (outW - 1)) * 2.4 - 1.2;
            const ny = -((y / (outH - 1)) * 2.2 - 1.1) + 0.1;
            const eq = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
            
            if (eq > 0) {
              // Outside the heart -> make transparent
              const idx = (y * outW + x) * 4;
              data[idx + 3] = 0; // Alpha = 0
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Return as PNG data URL
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for color profile'));
    img.src = imageUrl;
  });
}
