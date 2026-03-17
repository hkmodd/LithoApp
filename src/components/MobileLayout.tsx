import { useState, useMemo } from 'react';
import { Upload, Box, Activity, Layers, Lightbulb, Palette, Camera, Undo2, Redo2, Thermometer } from 'lucide-react';
import LithoPreview from './LithoPreview';
import ErrorBoundary from './ErrorBoundary';
import ImageTab from './tabs/ImageTab';
import ColorLithoTab from './tabs/ColorLithoTab';
import GeometryTab from './tabs/GeometryTab';
import FrameTab from './tabs/FrameTab';
import ExportBar from './ExportBar';
import ViewportOverlay from './ViewportOverlay';
import LanguageSelector from './LanguageSelector';
import MobileNavBar, { type MobileTab } from './MobileNavBar';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useTranslation } from '../i18n';
import type { CMYKChannel, ColorChannel } from '../workers/types';

interface MobileLayoutProps {
  wireframe: boolean;
  setWireframe: (v: boolean) => void;
  simulateLight: boolean;
  setSimulateLight: (v: boolean) => void;
  showTexture: boolean;
  setShowTexture: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isMobile?: boolean;
}

export default function MobileLayout({
  wireframe, setWireframe,
  simulateLight, setSimulateLight,
  showTexture, setShowTexture,
  showHeatmap, setShowHeatmap,
  isDragging, handleDragOver, handleDragLeave, handleDrop,
  fileInputRef, handleImageUpload,
}: MobileLayoutProps) {
  const { imageSrc, imageData, meshData, colorMeshSet, activeColorChannel, lithoParams, isProcessing, progress, mode, setMode, resetLithoParams, updateLithoParams } = useAppStore();
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const { t } = useTranslation();
  const [mobileTab, setMobileTab] = useState<MobileTab>('image');

  const hasImage = !!imageData;

  // ── Derive preview mesh (Bug 2 fix: match desktop channel switching) ──
  const previewMesh = useMemo(() => {
    if (mode === 'color-litho' && colorMeshSet) {
      if (activeColorChannel === 'composite') {
        return colorMeshSet.white; // composite uses white channel
      }
      const engineKey: CMYKChannel = activeColorChannel === 'black' ? 'key' : activeColorChannel as CMYKChannel;
      return colorMeshSet[engineKey] ?? colorMeshSet.white;
    }
    return meshData;
  }, [mode, colorMeshSet, activeColorChannel, meshData]);

  const hasThickness = !!(previewMesh?.thickness);

  // ─── PHASE A: Onboarding (no image loaded) ─────────────────────────
  if (!hasImage) {
    return (
      <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />

        {/* Full-screen tappable upload area */}
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 flex flex-col items-center justify-center gap-8 active:bg-white/[0.02] transition-colors duration-75"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-3"
          >
            <div className="bg-[#2563EB] p-2.5 rounded-2xl shadow-lg shadow-[#2563EB]/20">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">LithoApp</h1>
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.25em] mt-0.5">{t('app.subtitle')}</p>
            </div>
          </motion.div>

          {/* Upload CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(37, 99, 235, 0)',
                  '0 0 0 16px rgba(37, 99, 235, 0.1)',
                  '0 0 0 32px rgba(37, 99, 235, 0)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center border transition-colors duration-75",
                isDragging
                  ? "border-[#2563EB] bg-[#2563EB]/20"
                  : "border-white/15 bg-white/5"
              )}
            >
              <Upload className={cn("w-8 h-8", isDragging ? "text-[#2563EB]" : "text-gray-400")} />
            </motion.div>

            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-gray-300">
                {isDragging ? t('upload.dropHere') : t('upload.tapOrDrop')}
              </p>
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                PNG · JPEG
              </p>
            </div>
          </motion.div>

          {/* Processing indicator (if user uploads during onboarding) */}
          <AnimatePresence>
            {isProcessing && progress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-xs bg-black/60 backdrop-blur-xl border border-[#2563EB]/30 rounded-xl p-3 shadow-2xl flex items-center gap-3"
              >
                <Activity className="w-4 h-4 text-[#2563EB] animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 block mb-1 truncate">{progress.message}</span>
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
        </button>

        {/* Bottom: Mode toggle + Language */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="px-5 pb-6 space-y-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
        >
          <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-600 block text-center">{t('mode.label')}</label>
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button
              onClick={(e) => { e.stopPropagation(); setMode('lithophane'); }}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors duration-75",
                mode === 'lithophane' ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20" : "text-gray-400"
              )}
            >
              {t('mode.lithophane')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMode('extrusion'); }}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors duration-75",
                mode === 'extrusion' ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20" : "text-gray-400"
              )}
            >
              {t('mode.extrusion')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMode('color-litho'); }}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors duration-75",
                mode === 'color-litho' ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20" : "text-gray-400"
              )}
            >
              {t('mode.colorLitho')}
            </button>
          </div>
          <div className="flex justify-center">
            <LanguageSelector />
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── PHASE B: Workspace (image loaded) ─────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#2563EB]/30 flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />

      {/* =========== TOP: 3D Preview (always visible) =========== */}
      <div
        className="relative bg-[#050505]"
        style={mobileTab === 'view'
          ? { flex: '1 1 0%', minHeight: 0 }
          : { height: '42dvh', flexShrink: 0 }
        }
      >
        {/* 3D Canvas */}
        {previewMesh ? (
          <ErrorBoundary region="3D Preview">
            <LithoPreview
              positions={previewMesh.positions}
              indices={previewMesh.indices}
              normals={previewMesh.normals || null}
              uvs={previewMesh.uvs || null}
              thickness={previewMesh.thickness || null}
              wireframe={wireframe}
              simulateLight={simulateLight}
              textureUrl={imageSrc}
              showTexture={showTexture}
              showHeatmap={showHeatmap}
              minThickness={lithoParams.baseThickness}
              maxThickness={lithoParams.maxThickness}
              isMobile={true}
            />
          </ErrorBoundary>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3 opacity-40"
            >
              <Activity className="w-10 h-10 mx-auto text-[#2563EB] animate-pulse" />
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
                {isProcessing ? progress?.message || t('app.awaitingInput') : t('app.awaitingInput')}
              </p>
            </motion.div>
          </div>
        )}

        {/* Compact branding (top-left) */}
        <div className="absolute left-2 z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
          <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-1.5 shadow-xl">
            <div className="bg-[#2563EB] p-1 rounded-lg">
              <Box className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">LithoApp</span>
          </div>
        </div>

        {/* Viewport controls (top-right) */}
        <AnimatePresence>
          {previewMesh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-2 z-10 flex gap-1"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
            >
              {/* Undo / Redo */}
              <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-0.5 flex gap-0.5 shadow-xl">
                <button
                  onClick={() => { const r = useHistoryStore.getState().undo(); if (r) updateLithoParams({ ...r, _skipHistory: true }); }}
                  disabled={!canUndo}
                  className={cn("p-1.5 rounded-lg transition-colors duration-75", canUndo ? "text-gray-300 active:bg-white/10" : "text-gray-600")}
                  aria-label="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { const r = useHistoryStore.getState().redo(); if (r) updateLithoParams({ ...r, _skipHistory: true }); }}
                  disabled={!canRedo}
                  className={cn("p-1.5 rounded-lg transition-colors duration-75", canRedo ? "text-gray-300 active:bg-white/10" : "text-gray-600")}
                  aria-label="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* View toggles */}
              <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-0.5 flex gap-0.5 shadow-xl">
              <button
                onClick={() => setSimulateLight(!simulateLight)}
                className={cn("p-1.5 rounded-lg transition-colors duration-75", simulateLight ? "bg-white/10 text-yellow-400" : "text-gray-400")}
                aria-label={simulateLight ? 'Disable backlight' : 'Enable backlight'}
                aria-pressed={simulateLight}
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setWireframe(!wireframe)}
                className={cn("p-1.5 rounded-lg transition-colors duration-75", wireframe ? "bg-white/10 text-[#2563EB]" : "text-gray-400")}
                aria-label={wireframe ? 'Disable wireframe' : 'Enable wireframe'}
                aria-pressed={wireframe}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowTexture(!showTexture)}
                className={cn("p-1.5 rounded-lg transition-colors duration-75", showTexture ? "bg-white/10 text-emerald-400" : "text-gray-400")}
                title={t('viewport.colorMap')}
                aria-label={t('viewport.colorMap')}
                aria-pressed={showTexture}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                disabled={!hasThickness}
                className={cn(
                  "p-1.5 rounded-lg transition-colors duration-75",
                  !hasThickness ? "text-gray-700 cursor-not-allowed" :
                  showHeatmap ? "bg-white/10 text-orange-400" : "text-gray-400"
                )}
                title={t('viewport.heatmap')}
                aria-label={t('viewport.heatmap')}
                aria-pressed={showHeatmap}
              >
                <Thermometer className="w-3.5 h-3.5" />
              </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regeneration overlay — blurs viewport only, controls stay interactive */}
        <ViewportOverlay />
      </div>

      {/* =========== BOTTOM: Tab Content (hidden in view mode) =========== */}
      {mobileTab !== 'view' && (
      <div className="flex-1 min-h-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={mobileTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06 }}
            className="p-4 space-y-5"
          >
            {/* ── Image Tab ── */}
            {mobileTab === 'image' && (
              <>
                {/* Mode Switcher */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-600">{t('mode.label')}</label>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setMode('lithophane')}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75",
                        mode === 'lithophane' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400"
                      )}
                    >
                      {t('mode.lithophane')}
                    </button>
                    <button
                      onClick={() => setMode('extrusion')}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75",
                        mode === 'extrusion' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400"
                      )}
                    >
                      {t('mode.extrusion')}
                    </button>
                    <button
                      onClick={() => setMode('color-litho')}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-colors duration-75",
                        mode === 'color-litho' ? "bg-[#2563EB] text-white shadow-md" : "text-gray-400"
                      )}
                    >
                      {t('mode.colorLitho')}
                    </button>
                  </div>
                </div>

                {/* Source Image */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-600">{t('upload.label')}</label>
                  <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/50 aspect-[16/9]">
                    <img src={imageSrc!} alt="Source" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium rounded-full shadow-xl flex items-center gap-2 active:scale-95 transition-transform duration-75"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {t('upload.replace')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image processing controls (or ColorLithoTab for color-litho mode) */}
                {mode === 'color-litho' ? <ColorLithoTab /> : <ImageTab />}
              </>
            )}

            {/* ── Mesh Tab (Geometry + Frame) ── */}
            {mobileTab === 'mesh' && (
              <>
                {/* Header with language + reset */}
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">{t('tab.geometry')} · {t('tab.frame')}</h3>
                  <div className="flex items-center gap-1.5">
                    <LanguageSelector />
                    <button onClick={resetLithoParams} className="text-[9px] font-mono uppercase text-gray-500 px-2 py-1 rounded-full bg-white/5 active:bg-white/10 transition-colors duration-75">
                      {t('app.reset')}
                    </button>
                  </div>
                </div>

                {/* All mesh controls in one scrollable view */}
                <GeometryTab />
                <div className="border-t border-white/5 pt-4">
                  <FrameTab />
                </div>
              </>
            )}

            {/* ── Export Tab ── */}
            {mobileTab === 'export' && (
              <ExportBar />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}

      {/* =========== Bottom Navigation Bar =========== */}
      <MobileNavBar
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        hasMesh={!!previewMesh}
      />
    </div>
  );
}
