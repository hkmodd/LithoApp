import { useState, useCallback, useRef, useEffect } from 'react';
import { Palette, Download, FileBox, Check, Box, Triangle, Archive } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { LithoParams } from '../store/useAppStore';
import type { CMYWChannel, ColorMeshSet, PaletteMeshSet } from '../workers/types';
import { COLOR_CHANNELS } from '../workers/types';
import { encodeBinarySTL } from '../utils/stlEncoder';
import { encodeOBJ } from '../utils/objEncoder';
import { generateColorProfile } from '../utils/colorProfile';
import { useTranslation } from '../i18n';
import { heavy } from '../lib/haptics';

/* ─── animated counting hook ───────────────────────────────── */
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(target);

  useEffect(() => {
    const from = fromRef.current;
    const diff = target - from;
    if (diff === 0) return;

    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); fromRef.current = target; };
  }, [target, duration]);

  return value;
}

/* ─── download feedback state ──────────────────────────────── */
type DownloadState = 'idle' | 'downloading' | 'done';

export default function ExportBar() {
  // Individual selectors — no re-render on unrelated store changes (e.g. progress)
  const meshData = useAppStore(s => s.meshData);
  const imageSrc = useAppStore(s => s.imageSrc);
  const lithoParams = useAppStore(s => s.lithoParams);
  const isProcessing = useAppStore(s => s.isProcessing);
  const mode = useAppStore(s => s.mode);
  const colorMeshSet = useAppStore(s => s.colorMeshSet);
  const paletteMeshSet = useAppStore(s => s.paletteMeshSet);
  const { t } = useTranslation();

  const [stlState, setStlState] = useState<DownloadState>('idle');
  const [objState, setObjState] = useState<DownloadState>('idle');
  const [colorState, setColorState] = useState<DownloadState>('idle');
  const [zipState, setZipState] = useState<DownloadState>('idle');

  /* ─── compute stats for any mode ──────────────────────── */
  const { totalTriangles, estSizeMB } = (() => {
    if (mode === 'color-litho' && colorMeshSet) {
      const tris = COLOR_CHANNELS.reduce((sum, ch) => sum + colorMeshSet[ch].stats.triangles, 0);
      // ZIP: 5 binary STLs (each 84 + tri*50 bytes), ~0% compression on binary
      const rawBytes = COLOR_CHANNELS.reduce((sum, ch) => sum + 84 + colorMeshSet[ch].stats.triangles * 50, 0);
      return { totalTriangles: tris, estSizeMB: rawBytes / (1024 * 1024) };
    }
    if (mode === 'palette-litho' && paletteMeshSet?.entries?.length) {
      const tris = paletteMeshSet.entries.reduce((sum, e) => sum + e.mesh.stats.triangles, 0);
      const rawBytes = paletteMeshSet.entries.reduce((sum, e) => sum + 84 + e.mesh.stats.triangles * 50, 0);
      return { totalTriangles: tris, estSizeMB: rawBytes / (1024 * 1024) };
    }
    if (meshData) {
      const tris = meshData.stats.triangles;
      return { totalTriangles: tris, estSizeMB: (84 + tris * 50) / (1024 * 1024) };
    }
    return { totalTriangles: 0, estSizeMB: 0 };
  })();

  const animatedTriangles = useCountUp(totalTriangles);

  const hasOutput = mode === 'color-litho' ? !!colorMeshSet
    : mode === 'palette-litho' ? !!(paletteMeshSet?.entries?.length)
    : !!meshData;
  const disabled = !hasOutput || isProcessing;

  const plateCount = mode === 'color-litho' && colorMeshSet ? COLOR_CHANNELS.length
    : mode === 'palette-litho' && paletteMeshSet ? paletteMeshSet.entries.length
    : 0;

  /* ─── download handlers ──────────────────────────────────── */
  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    // Defer revocation so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  const handleExportSTL = useCallback(async () => {
    if (!meshData) return;
    setStlState('downloading');
    heavy();

    const worker = useAppStore.getState().meshWorker;
    if (worker) {
      // Use the WASM worker — zero main-thread blocking
      const stlId = Date.now();
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'stl-complete' && e.data.id === stlId) {
          worker.removeEventListener('message', handler);
          const blob = new Blob([e.data.stlBuffer], { type: 'application/octet-stream' });
          triggerDownload(blob, 'lithophane.stl');
          setStlState('done');
          setTimeout(() => setStlState('idle'), 2000);
        }
      };
      worker.addEventListener('message', handler);
      worker.postMessage({
        id: stlId,
        mode: 'encode-stl',
        stlPositions: meshData.positions,
        stlIndices: meshData.indices,
        // Required by WorkerRequest shape but unused for encode-stl
        imageData: new ImageData(1, 1),
        width: 1,
        height: 1,
        params: {} as LithoParams,
      });
    } else {
      // Fallback to synchronous JS encoder (should rarely happen)
      await new Promise(r => setTimeout(r, 150));
      const blob = encodeBinarySTL(meshData.positions, meshData.indices);
      triggerDownload(blob, 'lithophane.stl');
      setStlState('done');
      setTimeout(() => setStlState('idle'), 2000);
    }
  }, [meshData, triggerDownload]);

  const handleExportOBJ = useCallback(async () => {
    if (!meshData) return;
    setObjState('downloading');
    heavy();
    await new Promise(r => setTimeout(r, 150));
    const blob = encodeOBJ(meshData.positions, meshData.indices, meshData.uvs);
    triggerDownload(blob, 'lithophane.obj');
    setObjState('done');
    setTimeout(() => setObjState('idle'), 2000);
  }, [meshData, triggerDownload]);

  const handleExportColorProfile = useCallback(async () => {
    if (!imageSrc) return;
    setColorState('downloading');
    heavy();
    try {
      const dataUrl = await generateColorProfile(imageSrc, lithoParams);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'lithophane_color_profile.png';
      a.click();
      setColorState('done');
      setTimeout(() => setColorState('idle'), 2000);
    } catch (err) {
      console.error('Failed to generate color profile:', err);
      setColorState('idle');
    }
  }, [imageSrc, lithoParams]);

  /* ─── Export All Plates (ZIP) ─────────────────────────────── */
  const handleExportZip = useCallback(() => {
    const cms = useAppStore.getState().colorMeshSet;
    const worker = useAppStore.getState().meshWorker;
    if (!worker || !cms) return;

    setZipState('downloading');
    heavy();

    // Build stlPack: extract positions & indices from each channel
    const stlPack: Record<CMYWChannel, { positions: Float32Array; indices: Uint32Array }> =
      {} as Record<CMYWChannel, { positions: Float32Array; indices: Uint32Array }>;
    for (const ch of COLOR_CHANNELS) {
      stlPack[ch] = { positions: cms[ch].positions, indices: cms[ch].indices };
    }

    const packId = Date.now();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'stl-pack-complete' && e.data.id === packId) {
        worker.removeEventListener('message', handler);
        const blob = new Blob([e.data.zipBuffer], { type: 'application/zip' });
        triggerDownload(blob, 'color_litho_plates.zip');
        setZipState('done');
        setTimeout(() => setZipState('idle'), 2000);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({
      id: packId,
      mode: 'encode-stl-pack',
      stlPack,
      // Required by WorkerRequest shape but unused
      imageData: new ImageData(1, 1),
      width: 1,
      height: 1,
      params: {} as LithoParams,
    });
  }, [triggerDownload]);

  /* ─── Export Palette Plates (ZIP) ──────────────────────────── */
  const handleExportPaletteZip = useCallback(() => {
    const pms = useAppStore.getState().paletteMeshSet;
    const worker = useAppStore.getState().meshWorker;
    if (!worker || !pms || pms.entries.length === 0) return;

    setZipState('downloading');
    heavy();

    const packId = Date.now();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'stl-pack-complete' && e.data.id === packId) {
        worker.removeEventListener('message', handler);
        const blob = new Blob([e.data.zipBuffer], { type: 'application/zip' });
        triggerDownload(blob, 'palette_litho_plates.zip');
        setZipState('done');
        setTimeout(() => setZipState('idle'), 2000);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({
      id: packId,
      mode: 'encode-palette-stl-pack',
      palettePack: pms.entries,
      // Required by WorkerRequest shape but unused
      imageData: new ImageData(1, 1),
      width: 1,
      height: 1,
      params: {} as LithoParams,
    });
  }, [triggerDownload]);

  /* ─── button icon resolver ───────────────────────────────── */
  function stateIcon(state: DownloadState, fallback: React.ReactNode) {
    if (state === 'downloading') return <Download className="w-4 h-4 animate-bounce" />;
    if (state === 'done') return <Check className="w-4 h-4 text-emerald-400" />;
    return fallback;
  }

  return (
    <div className="export-panel">
      {/* ─── Stats Row ─────────────────────────────────────── */}
      {hasOutput && totalTriangles > 0 && (
        <div className="export-stats">
          <div className="export-stat-card">
            <Triangle className="w-3 h-3 text-neural-blue opacity-60" />
            <div>
              <span className="export-stat-label">
                {plateCount > 0 ? `${t('export.triangles')} (${plateCount} plates)` : t('export.triangles')}
              </span>
              <span className="export-stat-value">{animatedTriangles.toLocaleString()}</span>
            </div>
          </div>
          <div className="export-stat-card">
            <FileBox className="w-3 h-3 text-neural-blue opacity-60" />
            <div>
              <span className="export-stat-label">
                {plateCount > 0 ? `${t('export.estSize')} (ZIP)` : t('export.estSize')}
              </span>
              <span className="export-stat-value export-stat-accent">~{estSizeMB.toFixed(1)} MB</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Export Buttons ────────────────────────────────── */}
      <div className="export-actions">
        {mode !== 'color-litho' && mode !== 'palette-litho' && (
          <button
            onClick={handleExportColorProfile}
            disabled={disabled}
            className="export-btn export-btn-ghost"
            title={t('export.colorTooltip')}
          >
            {stateIcon(colorState, <Palette className="w-4 h-4" />)}
            <span className="export-btn-label">{t('export.colorMirrored')}</span>
          </button>
        )}

        {/* ─── ZIP Export (Color Litho only) ────────────────── */}
        {mode === 'color-litho' && colorMeshSet && (
          <button
            onClick={handleExportZip}
            disabled={disabled}
            className="export-btn export-btn-accent"
            title={t('color.exportAll')}
          >
            <div className="export-btn-shimmer" />
            {stateIcon(zipState, <Archive className="w-4 h-4" />)}
            <span className="export-btn-format">ZIP</span>
          </button>
        )}

        {/* ─── ZIP Export (Palette Litho) ──────────────────── */}
        {mode === 'palette-litho' && paletteMeshSet && paletteMeshSet.entries.length > 0 && (
          <button
            onClick={handleExportPaletteZip}
            disabled={disabled}
            className="export-btn export-btn-accent"
            title={t('color.exportAll')}
          >
            <div className="export-btn-shimmer" />
            {stateIcon(zipState, <Archive className="w-4 h-4" />)}
            <span className="export-btn-format">ZIP</span>
          </button>
        )}

        {/* Single-mesh exports: hide in color/palette modes */}
        {mode !== 'color-litho' && mode !== 'palette-litho' && (
          <>
            <button
              onClick={handleExportSTL}
              disabled={disabled}
              className="export-btn export-btn-primary"
              title={t('export.stlTooltip')}
            >
              <div className="export-btn-shimmer" />
              {stateIcon(stlState, <Download className="w-4 h-4" />)}
              <span className="export-btn-format">STL</span>
            </button>

            <button
              onClick={handleExportOBJ}
              disabled={disabled}
              className="export-btn export-btn-secondary"
              title={t('export.objTooltip')}
            >
              <div className="export-btn-shimmer" />
              {stateIcon(objState, <Box className="w-4 h-4" />)}
              <span className="export-btn-format">OBJ</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
