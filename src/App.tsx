import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, Layers, Box, Activity, Image as ImageIcon, Lightbulb, Cylinder, Square, Circle, Heart, Link, Palette } from 'lucide-react';
import { encodeBinarySTL } from './utils/stlEncoder';
import { encodeOBJ } from './utils/objEncoder';
import { generateColorProfile } from './utils/colorProfile';
import LithoPreview from './components/LithoPreview';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const {
    mode,
    setMode,
    imageSrc,
    imageData,
    setImage,
    isProcessing,
    progress,
    setProcessing,
    setProgress,
    meshData,
    setMeshData,
    lithoParams,
    updateLithoParams,
    resetLithoParams
  } = useAppStore();

  const {
    shape,
    resolution,
    physicalSize,
    baseThickness,
    maxThickness,
    borderWidth,
    frameThickness,
    baseStand,
    curveAngle,
    smoothing,
    contrast,
    brightness,
    sharpness,
    invert,
    hanger,
    threshold
  } = lithoParams;
  
  const [activeTab, setActiveTab] = useState<'image' | 'geometry' | 'frame'>('image');
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  
  const [wireframe, setWireframe] = useState(false);
  const [simulateLight, setSimulateLight] = useState(true);
  
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/meshWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setProgress({ percent: e.data.progress, message: e.data.message });
      } else if (e.data.type === 'complete') {
        setMeshData({
          positions: e.data.positions,
          indices: e.data.indices,
          uvs: e.data.uvs,
          stats: e.data.stats
        });
        setProcessing(false);
        setProgress(null);
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, [setMeshData, setProcessing, setProgress]);

  const processImage = useCallback((imgData: { data: ImageData, width: number, height: number }, params: any) => {
    if (!workerRef.current) return;
    setProcessing(true);
    setProgress({ percent: 0, message: 'Starting...' });
    workerRef.current.postMessage({
      mode: mode,
      imageData: imgData.data,
      width: imgData.width,
      height: imgData.height,
      params
    });
  }, [mode, setProcessing, setProgress]);

  // Re-process when parameters change
  useEffect(() => {
    if (imageData) {
      processImage(imageData, lithoParams);
    }
  }, [lithoParams, imageData, processImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        setImage(src, { data, width: img.width, height: img.height });
        setIsControlsOpen(true); // Open controls when image is loaded
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleExportSTL = () => {
    if (!meshData) return;
    const blob = encodeBinarySTL(meshData.positions, meshData.indices);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lithophane.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOBJ = () => {
    if (!meshData) return;
    const blob = encodeOBJ(meshData.positions, meshData.indices, meshData.uvs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lithophane.obj';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportColorProfile = async () => {
    if (!imageSrc) return;
    try {
      const dataUrl = await generateColorProfile(imageSrc, lithoParams);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'lithophane_color_profile.png';
      a.click();
    } catch (err) {
      console.error('Failed to generate color profile:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#2563EB]/30">
      
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
            <h2 className="text-xl font-semibold mb-2">Please Rotate Your Device</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              LithoApp is optimized for portrait mode on mobile devices to provide the best 3D viewing experience.
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
              <p className="text-sm font-mono uppercase tracking-[0.3em] text-gray-500">Awaiting Neural Input</p>
            </motion.div>
          </div>
        ) : (
          <LithoPreview 
            positions={meshData?.positions || null} 
            indices={meshData?.indices || null} 
            wireframe={wireframe} 
            simulateLight={simulateLight}
          />
        )}
      </div>

      {/* Top Navigation Bar (Glassmorphism) */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 pointer-events-none"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
              <div className="bg-[#2563EB] p-2 rounded-xl">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight leading-none">LithoApp</h1>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-1">Neural Surface</p>
              </div>
            </div>

            {/* Progress Indicator */}
            <AnimatePresence>
              {isProcessing && progress && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-black/40 backdrop-blur-xl border border-[#2563EB]/30 rounded-xl p-3 shadow-2xl pointer-events-auto flex items-center gap-3"
                >
                  <Activity className="w-4 h-4 text-[#2563EB] animate-pulse" />
                  <div className="flex flex-col w-32">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 mb-1">{progress.message}</span>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#2563EB] transition-all duration-300 ease-out"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Viewport Controls */}
          <AnimatePresence>
            {meshData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex gap-1 shadow-2xl pointer-events-auto"
              >
                <button 
                  onClick={() => setSimulateLight(!simulateLight)}
                  className={cn("p-2.5 rounded-xl transition-all", simulateLight ? "bg-white/10 text-yellow-400 shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5")}
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setWireframe(!wireframe)}
                  className={cn("p-2.5 rounded-xl transition-all", wireframe ? "bg-white/10 text-[#2563EB] shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5")}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mobile Bottom Sheet / Desktop Side Panel */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[400px] z-30 flex flex-col pointer-events-none"
        initial={false}
        animate={
          isMobile 
            ? { y: isControlsOpen ? 0 : 'calc(100% - 80px)', x: 0 } 
            : { x: isControlsOpen ? 0 : '100%', y: 0 }
        }
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (isMobile) {
            if (offset.y > 50 || velocity.y > 200) {
              setIsControlsOpen(false);
            } else if (offset.y < -50 || velocity.y < -200) {
              setIsControlsOpen(true);
            }
          }
        }}
      >
        <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border-t md:border-t-0 md:border-l border-white/10 rounded-t-3xl md:rounded-none flex flex-col h-[65vh] md:h-full shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
          
          {/* Drag Handle (Mobile) */}
          <div 
            className="w-full h-12 flex flex-col items-center justify-center md:hidden cursor-grab active:cursor-grabbing gap-1"
            onClick={() => setIsControlsOpen(!isControlsOpen)}
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">
              {isControlsOpen ? 'Swipe Down' : 'Swipe Up'}
            </span>
          </div>

          {/* Desktop Toggle Button */}
          <button 
            className="hidden md:flex absolute top-1/2 -left-12 w-12 h-24 bg-[#0a0a0a]/80 backdrop-blur-3xl border-y border-l border-white/10 rounded-l-2xl items-center justify-center cursor-pointer hover:bg-white/10 transition-colors pointer-events-auto"
            onClick={() => setIsControlsOpen(!isControlsOpen)}
          >
            <div className="w-1.5 h-12 bg-white/20 rounded-full" />
          </button>

          {/* Header */}
          <div className="px-6 pb-4 md:pt-8 flex items-center justify-between border-b border-white/5">
            <h2 className="text-lg font-medium tracking-tight">Parameters</h2>
            <button onClick={resetLithoParams} className="text-[10px] font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10">
              Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="p-6 space-y-8">
              
              {/* Mode Switcher */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Generation Mode</label>
                <div className="flex bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setMode('lithophane')}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                      mode === 'lithophane' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400 hover:text-white"
                    )}
                  >
                    Lithophane
                  </button>
                  <button
                    onClick={() => setMode('extrusion')}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                      mode === 'extrusion' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400 hover:text-white"
                    )}
                  >
                    Logo Extrusion
                  </button>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Source Asset</label>
                </div>
                
                {imageSrc ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-video">
                    <img src={imageSrc} alt="Source" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-medium rounded-full shadow-xl transition-all flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Replace Asset
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border border-dashed border-white/20 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-all rounded-2xl flex flex-col items-center justify-center gap-3 group bg-white/5"
                  >
                    <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-[#2563EB]" />
                    </div>
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Tap to Upload Image</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
              </div>

              {/* Tabs */}
              <div className={cn("space-y-6 transition-opacity duration-500", !imageData && "opacity-20 pointer-events-none")}>
                <div className="flex p-1 bg-white/5 rounded-xl">
                  {['image', 'geometry', 'frame'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all", 
                        activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content: Image */}
                {activeTab === 'image' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {mode === 'extrusion' ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-xs text-gray-400">Extrusion Threshold</label>
                          <span className="text-xs font-mono text-[#2563EB]">{threshold}</span>
                        </div>
                        <input type="range" min="0" max="255" step="1" value={threshold} onChange={(e) => updateLithoParams({ threshold: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                        <p className="text-[10px] text-gray-500 leading-relaxed">Pixels darker than this value will be extruded to max thickness.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-xs text-gray-400">Contrast</label>
                            <span className="text-xs font-mono text-[#2563EB]">{contrast.toFixed(1)}x</span>
                          </div>
                          <input type="range" min="0.0" max="3.0" step="0.1" value={contrast} onChange={(e) => updateLithoParams({ contrast: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-xs text-gray-400">Brightness</label>
                            <span className="text-xs font-mono text-[#2563EB]">{brightness > 0 ? '+' : ''}{brightness.toFixed(2)}</span>
                          </div>
                          <input type="range" min="-1.0" max="1.0" step="0.05" value={brightness} onChange={(e) => updateLithoParams({ brightness: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-xs text-gray-400">Edge Enhancement</label>
                            <span className="text-xs font-mono text-[#2563EB]">{sharpness.toFixed(1)}</span>
                          </div>
                          <input type="range" min="0.0" max="2.0" step="0.1" value={sharpness} onChange={(e) => updateLithoParams({ sharpness: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                          <p className="text-[10px] text-gray-500 leading-relaxed">Increases local contrast to preserve fine details during 3D printing.</p>
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <label className="text-xs text-gray-300">Invert Depth Polarity</label>
                      <button 
                        onClick={() => updateLithoParams({ invert: !invert })}
                        className={cn("w-12 h-6 rounded-full transition-colors relative", invert ? "bg-[#2563EB]" : "bg-white/10")}
                      >
                        <motion.div 
                          layout
                          className="absolute top-1 bottom-1 w-4 rounded-full bg-white shadow-sm"
                          initial={false}
                          animate={{ left: invert ? "calc(100% - 20px)" : "4px" }}
                        />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Tab Content: Geometry */}
                {activeTab === 'geometry' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    {/* Shape Selector */}
                    <div className="space-y-3">
                      <label className="text-xs text-gray-400">Shape</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'flat', label: 'Flat', icon: Square },
                          { id: 'arc', label: 'Arc', icon: Cylinder },
                          { id: 'cylinder', label: 'Cylinder', icon: Cylinder },
                          { id: 'sphere', label: 'Sphere', icon: Circle },
                          { id: 'heart', label: 'Heart', icon: Heart },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => updateLithoParams({ shape: s.id as any })}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-xl border transition-all",
                              shape === s.id 
                                ? "border-[#2563EB] bg-[#2563EB]/10 text-white" 
                                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                            )}
                          >
                            <s.icon className="w-4 h-4" />
                            <span className="text-xs font-medium">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Max Dimension</label>
                        <span className="text-xs font-mono text-[#2563EB]">{physicalSize}mm</span>
                      </div>
                      <input type="range" min="50" max="300" step="10" value={physicalSize} onChange={(e) => updateLithoParams({ physicalSize: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Mesh Density (LOD)</label>
                        <span className="text-xs font-mono text-[#2563EB]">{resolution}px</span>
                      </div>
                      <input type="range" min="64" max="512" step="32" value={resolution} onChange={(e) => updateLithoParams({ resolution: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Base Thickness (Z-min)</label>
                        <span className="text-xs font-mono text-[#2563EB]">{baseThickness.toFixed(1)}mm</span>
                      </div>
                      <input type="range" min="0.2" max="2.0" step="0.1" value={baseThickness} onChange={(e) => updateLithoParams({ baseThickness: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Max Thickness (Z-max)</label>
                        <span className="text-xs font-mono text-[#2563EB]">{maxThickness.toFixed(1)}mm</span>
                      </div>
                      <input type="range" min="1.0" max="10.0" step="0.1" value={maxThickness} onChange={(e) => updateLithoParams({ maxThickness: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Laplacian Smoothing</label>
                        <span className="text-xs font-mono text-[#2563EB]">{smoothing} iter</span>
                      </div>
                      <input type="range" min="0" max="5" step="1" value={smoothing} onChange={(e) => updateLithoParams({ smoothing: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>
                  </motion.div>
                )}

                {/* Tab Content: Frame */}
                {activeTab === 'frame' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Border Frame Width</label>
                        <span className="text-xs font-mono text-[#2563EB]">{borderWidth.toFixed(1)}mm</span>
                      </div>
                      <input type="range" min="0" max="10.0" step="0.5" value={borderWidth} onChange={(e) => updateLithoParams({ borderWidth: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400">Frame Thickness</label>
                        <span className="text-xs font-mono text-[#2563EB]">{frameThickness.toFixed(1)}mm</span>
                      </div>
                      <input type="range" min="1.0" max="15.0" step="0.5" value={frameThickness} onChange={(e) => updateLithoParams({ frameThickness: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-xs text-gray-400 flex items-center gap-1">
                          <Square className="w-3 h-3" /> Base Stand Depth
                        </label>
                        <span className="text-xs font-mono text-[#2563EB]">{baseStand.toFixed(1)}mm</span>
                      </div>
                      <input type="range" min="0" max="20.0" step="1.0" value={baseStand} onChange={(e) => updateLithoParams({ baseStand: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                    </div>

                    {(shape === 'flat' || shape === 'arc' || shape === 'heart') && (
                      <div className="pt-4 border-t border-white/10">
                        <button
                          onClick={() => updateLithoParams({ hanger: !hanger })}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                            hanger 
                              ? "border-[#2563EB] bg-[#2563EB]/10 text-white" 
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Link className="w-4 h-4" />
                            <span className="text-sm font-medium">Add Top Hanger</span>
                          </div>
                          <div className={cn(
                            "w-8 h-4 rounded-full transition-colors relative",
                            hanger ? "bg-[#2563EB]" : "bg-gray-600"
                          )}>
                            <div className={cn(
                              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                              hanger ? "left-4.5" : "left-0.5"
                            )} />
                          </div>
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                          Adds a 5mm ring at the top center to easily hang the lithophane (e.g., as an ornament).
                        </p>
                      </div>
                    )}

                    {shape === 'arc' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-xs text-gray-400 flex items-center gap-1">
                            <Cylinder className="w-3 h-3" /> Curve Angle
                          </label>
                          <span className="text-xs font-mono text-[#2563EB]">{curveAngle}°</span>
                        </div>
                        <input type="range" min="0" max="360" step="5" value={curveAngle} onChange={(e) => updateLithoParams({ curveAngle: Number(e.target.value) })} className="w-full accent-[#2563EB]" />
                        {curveAngle >= 359.9 && (
                          <p className="text-[10px] text-emerald-400 leading-relaxed bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            Full cylinder mode active. Edges are welded for water-tight 3D printing.
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Export Section & Telemetry */}
          <div className="p-4 md:p-6 bg-black/60 backdrop-blur-xl border-t border-white/5">
            {meshData && (
              <div className="flex justify-between items-center mb-4 px-2">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Triangles</p>
                  <p className="text-xs font-mono text-gray-300">{meshData.stats.triangles.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Est. Size</p>
                  <p className="text-xs font-mono text-[#2563EB]">~{((84 + meshData.stats.triangles * 50) / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              {mode === 'lithophane' && (
                <button 
                  onClick={handleExportColorProfile}
                  disabled={!meshData || isProcessing}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:text-gray-600 text-gray-300 rounded-2xl font-semibold tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-white/10"
                  title="Download Color Profile (Mirrored to stick on the back of the print)"
                >
                  <Palette className="w-5 h-5" />
                  Color (Mirrored)
                </button>
              )}
              
              <div className="flex-[2] flex gap-2">
                <button 
                  onClick={handleExportSTL}
                  disabled={!meshData || isProcessing}
                  className="flex-1 py-4 bg-[#2563EB] hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-2xl font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(37,99,235,0.3)] disabled:shadow-none active:scale-[0.98]"
                  title="Export as STL"
                >
                  STL
                </button>
                <button 
                  onClick={handleExportOBJ}
                  disabled={!meshData || isProcessing}
                  className="flex-1 py-4 bg-[#2563EB] hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-2xl font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(37,99,235,0.3)] disabled:shadow-none active:scale-[0.98]"
                  title="Export as OBJ (with UVs)"
                >
                  OBJ
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
