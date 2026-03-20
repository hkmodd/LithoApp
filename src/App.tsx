import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { Upload, Layers, Box, Activity, Image as ImageIcon, Lightbulb, Palette, Undo2, Redo2, Save, Download, FolderOpen, Thermometer, Clock } from 'lucide-react';
import LithoPreview from './components/LithoPreview';
import ErrorBoundary from './components/ErrorBoundary';
import ViewportOverlay from './components/ViewportOverlay';
import MobileLayout from './components/MobileLayout';
import BootSplash from './components/BootSplash';
import ImageTab from './components/tabs/ImageTab';
import GeometryTab from './components/tabs/GeometryTab';
import FrameTab from './components/tabs/FrameTab';
import ColorLithoTab from './components/tabs/ColorLithoTab';
import ExportBar from './components/ExportBar';
import ProjectGallery from './components/ProjectGallery';
import ImageEditor from './components/ImageEditor';
import CropOverlay from './components/CropOverlay';
import LanguageSelector from './components/LanguageSelector';
import UpdateToast from './components/UpdateToast';
import InstallBanner from './components/InstallBanner';
import VersionBadge from './components/VersionBadge';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from './store/useAppStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useProjectStore } from './store/useProjectStore';
import type { LithoParams, CMYWChannel } from './workers/types';
import { usePaletteStore } from './store/usePaletteStore';
import { useTranslation } from './i18n';
import { applyEdits, hasEdits } from './lib/imageProcessor';

// ── Self-contained progress indicator — owns its own store subscription ──
// Prevents progress ticks (4/sec) from re-rendering the entire App tree.
function ProgressIndicator() {
  const isProcessing = useAppStore(s => s.isProcessing);
  const progress = useAppStore(s => s.progress);
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isProcessing && progress && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-black/40 border border-[#2563EB]/30 rounded-xl p-3 shadow-2xl pointer-events-auto flex items-center gap-3"
        >
          <Activity className="w-4 h-4 text-[#2563EB] animate-pulse" />
          <div className="flex flex-col w-32">
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 mb-1">{progress.message}</span>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2563EB] transition-all duration-150 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  // ── Selective store subscriptions: each field is an independent selector ──
  // This prevents unrelated state changes (e.g. progress ticks) from
  // re-rendering the entire App tree.
  const mode = useAppStore(s => s.mode);
  const imageSrc = useAppStore(s => s.imageSrc);
  const imageData = useAppStore(s => s.imageData);
  const meshData = useAppStore(s => s.meshData);
  const colorMeshSet = useAppStore(s => s.colorMeshSet);
  const paletteMeshSet = useAppStore(s => s.paletteMeshSet);
  const activeColorChannel = useAppStore(s => s.activeColorChannel);
  const lithoParams = useAppStore(s => s.lithoParams);
  const originalImage = useAppStore(s => s.originalImage);
  const imageEdits = useAppStore(s => s.imageEdits);

  // Stable setter refs — these never change identity, so they don't
  // cause re-renders. Using individual selectors is fine since Zustand
  // returns stable function references.
  const setMode = useAppStore(s => s.setMode);
  const setImage = useAppStore(s => s.setImage);
  const setProcessing = useAppStore(s => s.setProcessing);
  const setRegenerating = useAppStore(s => s.setRegenerating);
  const setProgress = useAppStore(s => s.setProgress);
  const setMeshData = useAppStore(s => s.setMeshData);
  const setColorMeshSet = useAppStore(s => s.setColorMeshSet);
  const setPaletteMeshSet = useAppStore(s => s.setPaletteMeshSet);
  const updateLithoParams = useAppStore(s => s.updateLithoParams);
  const resetLithoParams = useAppStore(s => s.resetLithoParams);
  const setOriginalImage = useAppStore(s => s.setOriginalImage);
  const resetImageEdits = useAppStore(s => s.resetImageEdits);
  const { t } = useTranslation();

  
  const [activeTab, setActiveTab] = useState<'image' | 'geometry' | 'frame' | 'color'>('image');
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  
  const [wireframe, setWireframe] = useState(false);
  const [simulateLight, setSimulateLight] = useState(true);
  const [showTexture, setShowTexture] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [booted, setBooted] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // ── Derive preview mesh: either the active color channel, palette entry, or the main meshData ──
  const previewMesh = useMemo(() => {
    if (mode === 'color-litho' && colorMeshSet && activeColorChannel !== 'composite') {
      const engineKey: CMYWChannel = activeColorChannel as CMYWChannel;
      const channelMesh = colorMeshSet[engineKey];
      if (channelMesh) return channelMesh;
    }
    // Palette mode: show the first filament's mesh as default preview
    if (mode === 'palette-litho' && paletteMeshSet && paletteMeshSet.entries.length > 0) {
      return paletteMeshSet.entries[0].mesh;
    }
    return meshData;
  }, [mode, colorMeshSet, paletteMeshSet, activeColorChannel, meshData]);

  const hasThickness = !!(previewMesh?.thickness);
  
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generationIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressTimeRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Undo/Redo
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Project save/load
  const { isDirty, lastSavedAt, saveToLocal, exportToFile, importFromFile } = useProjectStore();
  const projectImportRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkLayout = () => {
      setIsMobile(window.innerWidth < 768);
      // Only show landscape warning on phones (<768px), not tablets
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 768);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    // Mark booted after initial layout check
    setBooted(true);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/meshWorker.ts', import.meta.url), { type: 'module' });
    // Share worker ref via store so ExportBar can post encode-stl messages
    useAppStore.getState().setMeshWorker(workerRef.current);
    workerRef.current.onmessage = (e) => {
      const currentGenId = generationIdRef.current;
      // Discard stale responses (race-condition guard)
      if (e.data.id !== undefined && e.data.id !== currentGenId) return;

      if (e.data.type === 'progress') {
        // Throttle progress updates to max 4/sec to avoid store flood
        const now = performance.now();
        if (now - lastProgressTimeRef.current >= 250 || e.data.progress >= 99) {
          lastProgressTimeRef.current = now;
          setProgress({ percent: e.data.progress, message: e.data.message });
        }
      } else if (e.data.type === 'error') {
        console.error('[LithoApp] Worker error:', e.data.message);
        setProcessing(false);
        setRegenerating(false);
        setProgress(null);
      } else if (e.data.type === 'complete') {
        // Use startTransition so geometry build doesn't block sliders
        startTransition(() => {
          setMeshData({
            positions: e.data.positions,
            indices: e.data.indices,
            normals: e.data.normals,
            uvs: e.data.uvs,
            thickness: e.data.thickness,
            stats: e.data.stats
          });
          setColorMeshSet(null); // clear color mesh when switching modes
          setPaletteMeshSet(null); // also clear palette mesh
        });
        setProcessing(false);
        setRegenerating(false);
        setProgress(null);
      } else if (e.data.type === 'color-complete') {
        // Color lithophane: 4 channel meshes received (C, M, Y, W)
        startTransition(() => {
          setColorMeshSet(e.data.colorMeshSet);
          // Also set the white channel as the "primary" mesh for stats display
          const whiteMesh = e.data.colorMeshSet.white;
          setMeshData({
            positions: whiteMesh.positions,
            indices: whiteMesh.indices,
            normals: whiteMesh.normals,
            uvs: whiteMesh.uvs,
            thickness: whiteMesh.thickness,
            stats: whiteMesh.stats
          });
        });
        setProcessing(false);
        setRegenerating(false);
        setProgress(null);
      } else if (e.data.type === 'palette-complete') {
        // Palette lithophane: per-filament meshes received
        startTransition(() => {
          setPaletteMeshSet(e.data.paletteMeshSet);
          setColorMeshSet(null); // clear CMYW data
          // Set first entry as primary mesh for stats display
          const first = e.data.paletteMeshSet.entries[0];
          if (first) {
            setMeshData({
              positions: first.mesh.positions,
              indices: first.mesh.indices,
              normals: first.mesh.normals,
              uvs: first.mesh.uvs,
              thickness: first.mesh.thickness,
              stats: first.mesh.stats
            });
          }
        });
        setProcessing(false);
        setRegenerating(false);
        setProgress(null);
      }
    };
    workerRef.current.onerror = (evt) => {
      console.error('[LithoApp] Worker uncaught error:', evt.message);
      setProcessing(false);
      setRegenerating(false);
      setProgress(null);
    };
    return () => {
      workerRef.current?.terminate();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [setMeshData, setColorMeshSet, setProcessing, setRegenerating, setProgress]);

  // ── History: initialize + subscribe to lithoParams changes ─────────
  useEffect(() => {
    // Initialize history with current params
    useHistoryStore.getState().init(useAppStore.getState().lithoParams);

    // Subscribe to lithoParams changes and push to history (debounced)
    const unsub = useAppStore.subscribe((state, prevState) => {
      if (state.lithoParams === prevState.lithoParams) return;
      if (state._skipHistory) return; // skip undo/redo-triggered updates

      // Debounce rapid slider changes — coalesce into one history entry
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      historyDebounceRef.current = setTimeout(() => {
        useHistoryStore.getState().push(state.lithoParams);
      }, 500);
    });

    return () => {
      unsub();
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  // ── Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y ─────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const restored = useHistoryStore.getState().undo();
        if (restored) updateLithoParams({ ...restored, _skipHistory: true });
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const restored = useHistoryStore.getState().redo();
        if (restored) updateLithoParams({ ...restored, _skipHistory: true });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateLithoParams]);

  // ── Auto-switch tab on mode change ──────────────────────────────
  useEffect(() => {
    if (mode === 'color-litho' || mode === 'palette-litho') {
      setActiveTab('color');
    } else if (activeTab === 'color') {
      // Leaving color/palette mode — switch to 'image' since 'color' tab doesn't exist
      setActiveTab('image');
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project restore from IndexedDB on mount ──────────────────
  useEffect(() => {
    useProjectStore.getState().loadFromLocal();
  }, []);

  // ── Auto-save to IndexedDB when params/mode/image change (debounced 2s) ──
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      // Skip changes caused by the initial IDB restore
      if (!useProjectStore.getState().initialLoadDone) return;

      const changed =
        state.lithoParams !== prevState.lithoParams ||
        state.mode !== prevState.mode ||
        state.imageSrc !== prevState.imageSrc;
      if (!changed) return;

      useProjectStore.getState().markDirty();

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        if (useProjectStore.getState().autoSaveEnabled) {
          useProjectStore.getState().saveToLocal();
        }
      }, 2000);
    });

    return () => {
      unsub();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);


  const processImage = useCallback((imgData: { data: ImageData, width: number, height: number }, params: LithoParams) => {
    if (!workerRef.current) return;
    const id = ++generationIdRef.current;
    setProcessing(true);
    setRegenerating(true);
    lastProgressTimeRef.current = 0;
    setProgress({ percent: 0, message: 'Starting...' });
    // Build message — include printConfigJson for palette-litho mode
    const msg: any = {
      id,
      mode: mode,
      imageData: imgData.data,
      width: imgData.width,
      height: imgData.height,
      params
    };
    if (mode === 'palette-litho') {
      const cfg = usePaletteStore.getState().buildPrintConfig();
      if (cfg) {
        msg.printConfigJson = JSON.stringify(cfg);
      }
    }
    workerRef.current.postMessage(msg);
  }, [mode, setProcessing, setRegenerating, setProgress]);

  // Re-process when parameters change (debounced to avoid flooding the worker)
  useEffect(() => {
    if (!imageData) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      processImage(imageData, lithoParams);
    }, 250);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [lithoParams, imageData, processImage]);

  // Re-apply image edits whenever they change
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!originalImage) return;
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(() => {
      const result = applyEdits(originalImage, imageEdits);
      setImage(result.src, { data: result.data, width: result.width, height: result.height });
    }, 150);
    return () => { if (editDebounceRef.current) clearTimeout(editDebounceRef.current); };
  }, [imageEdits, originalImage, setImage]);

  // Shared file loading logic (used by both click-upload and drag & drop)
  const loadImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    // Auto-snapshot current project to history before loading new image
    if (imageSrc) {
      useProjectStore.getState().saveToHistory();
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Store original image for non-destructive editing
        setOriginalImage(img);
        resetImageEdits();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        setImage(src, { data, width: img.width, height: img.height });
        setIsControlsOpen(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };


  // Mobile: use dedicated layout
  if (isMobile) {
    return (
      <>
        <BootSplash ready={booted} />
        <UpdateToast />
        <InstallBanner />
        <MobileLayout
          wireframe={wireframe}
          setWireframe={setWireframe}
          simulateLight={simulateLight}
          setSimulateLight={setSimulateLight}
          showTexture={showTexture}
          setShowTexture={setShowTexture}
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
          isDragging={isDragging}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          fileInputRef={fileInputRef}
          handleImageUpload={handleImageUpload}
          isMobile={true}
        />
      </>
    );
  }

  // Desktop layout
  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#2563EB]/30">
      
      {/* Boot Splash */}
      <BootSplash ready={booted} />
      {/* Service-worker update toast */}
      <UpdateToast />
      <InstallBanner />
      {/* Landscape Warning Overlay */}
      <AnimatePresence>
        {isLandscape && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 border-2 border-white/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
              <div className="w-8 h-12 border-2 border-white/50 rounded-lg transform rotate-90" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('rotate.title')}</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              {t('rotate.description')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        {!imageData ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center space-y-6 opacity-40"
            >
              <Box className="w-24 h-24 mx-auto text-gray-700 stroke-[1]" />
              <p className="text-sm font-mono uppercase tracking-[0.3em] text-gray-500">{t('app.awaitingInput')}</p>
            </motion.div>
          </div>
        ) : (
          <ErrorBoundary region="3D Preview">
            <LithoPreview 
              positions={previewMesh?.positions || null} 
              indices={previewMesh?.indices || null} 
              normals={previewMesh?.normals || null}
              uvs={previewMesh?.uvs || null}
              thickness={previewMesh?.thickness || null}
              wireframe={wireframe} 
              simulateLight={simulateLight}
              textureUrl={imageSrc}
              showTexture={showTexture}
              showHeatmap={showHeatmap}
              minThickness={lithoParams.baseThickness}
              maxThickness={lithoParams.maxThickness}
            />
          </ErrorBoundary>
        )}

        {/* Regeneration overlay — blurs viewport only, controls stay interactive */}
        <ViewportOverlay />
      </div>

      {/* Top Navigation Bar (Glassmorphism) */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "absolute top-0 left-0 z-20 p-4 md:p-6 pointer-events-none transition-[right] duration-300 ease-out",
          (!isMobile && isControlsOpen) ? 'right-[400px]' : 'right-0'
        )}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
              <div className="bg-[#2563EB] p-2 rounded-xl">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight leading-none">LithoApp</h1>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-1">{t('app.subtitle')}</p>
              </div>
            </div>

            {/* Progress Indicator — self-contained, doesn't re-render App */}
            <ProgressIndicator />
          </div>

          {/* Viewport Controls — bounce to center when desktop sidebar opens */}
          <AnimatePresence>
            {meshData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.8 }}
                className="flex gap-2"
              >
                {/* Undo / Redo */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1.5 flex gap-1 shadow-2xl pointer-events-auto">
                  <button
                    onClick={() => {
                      const restored = useHistoryStore.getState().undo();
                      if (restored) updateLithoParams({ ...restored, _skipHistory: true });
                    }}
                    disabled={!canUndo}
                    className={cn(
                      'p-2.5 rounded-xl transition-colors duration-75',
                      canUndo
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-600 cursor-not-allowed"
                    )}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const restored = useHistoryStore.getState().redo();
                      if (restored) updateLithoParams({ ...restored, _skipHistory: true });
                    }}
                    disabled={!canRedo}
                    className={cn(
                      'p-2.5 rounded-xl transition-colors duration-75',
                      canRedo
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-600 cursor-not-allowed"
                    )}
                    title="Redo (Ctrl+Shift+Z)"
                    aria-label="Redo (Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>

                {/* View toggles */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1.5 flex gap-1 shadow-2xl pointer-events-auto">
                  <button 
                    onClick={() => setSimulateLight(!simulateLight)}
                    className={cn("p-2.5 rounded-xl transition-colors duration-75", simulateLight ? "bg-white/10 text-yellow-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    aria-label={simulateLight ? 'Disable backlight simulation' : 'Enable backlight simulation'}
                    aria-pressed={simulateLight}
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setWireframe(!wireframe)}
                    className={cn("p-2.5 rounded-xl transition-colors duration-75", wireframe ? "bg-white/10 text-[#2563EB] shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    aria-label={wireframe ? 'Disable wireframe view' : 'Enable wireframe view'}
                    aria-pressed={wireframe}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowTexture(!showTexture)}
                    className={cn("p-2.5 rounded-xl transition-colors duration-75", showTexture ? "bg-white/10 text-emerald-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    title={t('viewport.colorMap')}
                    aria-label={t('viewport.colorMap')}
                    aria-pressed={showTexture}
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => hasThickness && setShowHeatmap(!showHeatmap)}
                    disabled={!hasThickness}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors duration-75",
                      !hasThickness
                        ? "text-gray-600 cursor-not-allowed opacity-40"
                        : showHeatmap
                          ? "bg-white/10 text-orange-400 shadow-inner"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                    title={hasThickness ? t('viewport.heatmap') : 'No thickness data'}
                    aria-label={t('viewport.heatmap')}
                    aria-pressed={showHeatmap}
                  >
                    <Thermometer className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Desktop Side Panel */}
      <motion.div 
        className="absolute top-0 bottom-0 right-0 w-[400px] z-30 flex flex-col pointer-events-none"
        initial={false}
        animate={{ x: isControlsOpen ? 0 : '100%', y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <div className="bg-[#0a0a0a] border-l border-white/10 flex flex-col h-full shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pointer-events-auto">

          {/* Desktop Toggle Button */}
          <button 
            className="hidden md:flex absolute top-1/2 -left-12 w-12 h-24 bg-[#0a0a0a] border-y border-l border-white/10 rounded-l-2xl items-center justify-center cursor-pointer hover:bg-white/10 transition-colors pointer-events-auto"
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            aria-label={isControlsOpen ? 'Collapse controls panel' : 'Expand controls panel'}
            aria-expanded={isControlsOpen}
          >
            <div className="w-1.5 h-12 bg-white/20 rounded-full" />
          </button>

          {/* Header */}
          <div className="px-6 pb-4 md:pt-8 flex items-center justify-between border-b border-white/5">
            <h2 className="text-lg font-medium tracking-tight">{t('app.parameters')}</h2>
            <div className="flex items-center gap-1.5">
              {/* Save / Export / Import project */}
              <button
                onClick={saveToLocal}
                title="Save project (localStorage)"
                aria-label="Save project"
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  isDirty
                    ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                    : 'text-gray-600 bg-white/5 hover:bg-white/10 hover:text-gray-400'
                )}
              >
                <Save size={13} />
              </button>
              <button
                onClick={exportToFile}
                title="Export project (.json)"
                aria-label="Export project as JSON file"
                className="p-1.5 rounded-full text-gray-600 bg-white/5 hover:bg-white/10 hover:text-gray-400 transition-colors"
              >
                <Download size={13} />
              </button>
              <button
                onClick={() => projectImportRef.current?.click()}
                title="Import project (.json)"
                aria-label="Import project from JSON file"
                className="p-1.5 rounded-full text-gray-600 bg-white/5 hover:bg-white/10 hover:text-gray-400 transition-colors"
              >
                <FolderOpen size={13} />
              </button>
              <input
                ref={projectImportRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await importFromFile(file);
                  e.target.value = ''; // allow re-import of same file
                }}
              />
              <button
                onClick={() => setShowGallery(true)}
                title="Project History"
                aria-label="Open project history gallery"
                className="p-1.5 rounded-full text-gray-600 bg-white/5 hover:bg-white/10 hover:text-gray-400 transition-colors"
              >
                <Clock size={13} />
              </button>

              <div className="w-px h-4 bg-white/10 mx-0.5" />

              <LanguageSelector />
              <VersionBadge />
              <button onClick={resetLithoParams} className="text-[10px] font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10">
                {t('app.reset')}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="p-6 space-y-8">
              
              {/* Mode Switcher */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{t('mode.label')}</label>
                <div className="flex bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setMode('lithophane')}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75", 
                      mode === 'lithophane' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {t('mode.lithophane')}
                  </button>
                  <button
                    onClick={() => setMode('extrusion')}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75",
                      mode === 'extrusion' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {t('mode.extrusion')}
                  </button>
                  <button
                    onClick={() => setMode('color-litho')}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75",
                      (mode === 'color-litho' || mode === 'palette-litho') ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {t('mode.colorLitho')}
                  </button>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{t('upload.label')}</label>
                </div>
                
                {imageSrc ? (
                  <>
                    <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-video">
                      <img src={imageSrc} alt="Source" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                      <CropOverlay />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-medium rounded-full shadow-xl transition-colors duration-75 flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {t('upload.replace')}
                        </button>
                      </div>
                    </div>
                    {/* Image Editor toolbar */}
                    <ImageEditor />
                  </>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full aspect-video border border-dashed transition-all rounded-2xl flex flex-col items-center justify-center gap-3 group ${
                      isDragging 
                        ? 'border-[#2563EB] bg-[#2563EB]/10 scale-[1.02] shadow-[0_0_30px_rgba(37,99,235,0.2)]' 
                        : 'border-white/20 hover:border-[#2563EB] hover:bg-[#2563EB]/5 bg-white/5'
                    }`}
                  >
                    <div className={`p-4 bg-white/5 rounded-full transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
                      <Upload className={`w-6 h-6 ${isDragging ? 'text-[#2563EB]' : 'text-gray-400 group-hover:text-[#2563EB]'}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">
                      {isDragging ? t('upload.dropHere') : t('upload.tapOrDrop')}
                    </span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
              </div>

              {/* Tabs */}
              <div className={cn("space-y-6 transition-opacity duration-500", !imageData && "opacity-20 pointer-events-none")}>
                <div className="flex p-1 bg-white/5 rounded-xl">
                  {(mode === 'color-litho' || mode === 'palette-litho'
                    ? (['color', 'geometry', 'frame'] as const)
                    : (['image', 'geometry', 'frame'] as const)
                  ).map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors duration-75", 
                        activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {t(`tab.${tab}`)}
                    </button>
                  ))}
                </div>

                {/* Tab Content: Image */}
                {activeTab === 'image' && mode !== 'color-litho' && mode !== 'palette-litho' && <ImageTab />}

                {/* Tab Content: Color */}
                {activeTab === 'color' && (mode === 'color-litho' || mode === 'palette-litho') && <ColorLithoTab />}

                {/* Tab Content: Geometry */}
                {activeTab === 'geometry' && <GeometryTab />}

                {/* Tab Content: Frame */}
                {activeTab === 'frame' && <FrameTab />}
              </div>
            </div>
          </div>

          {/* Export Section & Telemetry */}
          <ExportBar />
        </div>
      </motion.div>

      {/* Project Gallery Modal */}
      <ProjectGallery open={showGallery} onClose={() => setShowGallery(false)} />
    </div>
  );
}
