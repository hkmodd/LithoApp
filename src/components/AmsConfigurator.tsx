import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, ChevronDown, AlertTriangle, Beaker, Layers, Settings2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { usePaletteStore } from '../store/usePaletteStore';
import { useAppStore } from '../store/useAppStore';
import type { Filament } from '../models/filamentPalette';

// ─── Slot Selector (dropdown with filament swatches) ─────────────────────────

function SlotSelector({
  slotNumber,
  currentFilament,
  library,
  onSelect,
}: {
  slotNumber: number;
  currentFilament: Filament;
  library: Filament[];
  onSelect: (filament: Filament) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return library;
    const lower = search.toLowerCase();
    return library.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.brand.toLowerCase().includes(lower)
    );
  }, [library, search]);

  return (
    <div ref={ref} className="relative">
      {/* Slot button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
          open
            ? "bg-white/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
            : "bg-white/[0.04] border-white/8 hover:bg-white/[0.07] hover:border-white/15"
        )}
      >
        {/* Slot number badge */}
        <span className="w-5 h-5 rounded-md bg-white/10 text-[10px] font-mono text-gray-400 flex items-center justify-center shrink-0">
          {slotNumber}
        </span>

        {/* Colour swatch */}
        <span
          className="w-4 h-4 rounded-md border border-white/15 shrink-0"
          style={{ backgroundColor: currentFilament.hexColor }}
        />

        {/* Name */}
        <span className="flex-1 text-left text-[11px] text-white truncate">{currentFilament.name}</span>

        {/* TD tag */}
        <span className="text-[9px] font-mono text-gray-500">TD {currentFilament.td.toFixed(1)}</span>

        <ChevronDown className={cn("w-3 h-3 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-40 left-0 right-0 mt-1 max-h-52 overflow-hidden rounded-xl border border-white/10 bg-gray-900/98 backdrop-blur-xl shadow-2xl flex flex-col"
          >
            {/* Search */}
            <div className="px-3 py-2 border-b border-white/5">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter…"
                autoFocus
                className="w-full px-2.5 py-1 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
              {filtered.map(f => (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f); setOpen(false); setSearch(''); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-white/8 transition-colors",
                    f.id === currentFilament.id && "bg-indigo-500/15"
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm border border-white/10 shrink-0"
                    style={{ backgroundColor: f.hexColor }}
                  />
                  <span className="text-white truncate flex-1 text-left">{f.name}</span>
                  <span className="text-[8px] font-mono text-gray-500">{f.brand}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-center text-[10px] text-gray-600">No matches</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away handler */}
      {open && (
        <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setSearch(''); }} />
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AmsConfigurator() {
  const { t } = useTranslation();
  const amsSlots = usePaletteStore(s => s.amsSlots);
  const library = usePaletteStore(s => s.filamentLibrary);
  const assignSlot = usePaletteStore(s => s.assignSlot);
  const addSlot = usePaletteStore(s => s.addSlot);
  const removeSlot = usePaletteStore(s => s.removeSlot);
  const maxLayers = usePaletteStore(s => s.maxLayers);
  const setMaxLayers = usePaletteStore(s => s.setMaxLayers);
  const layerHeight = usePaletteStore(s => s.layerHeight);
  const setLayerHeight = usePaletteStore(s => s.setLayerHeight);
  const setManagerOpen = usePaletteStore(s => s.setManagerOpen);

  // Layer visibility toggles (for stacked 3D preview)
  const paletteMeshSet = useAppStore(s => s.paletteMeshSet);
  const paletteLayerVisibility = useAppStore(s => s.paletteLayerVisibility);
  const togglePaletteLayer = useAppStore(s => s.togglePaletteLayer);
  const hasLayerData = !!(paletteMeshSet && paletteMeshSet.entries.length > 0);

  // Warnings
  const hasWhite = amsSlots.some(s => {
    const hex = s.filament.hexColor.toLowerCase();
    return hex === '#ffffff' || hex === '#fafafa' || hex === '#f0f0f0';
  });

  return (
    <div className="space-y-4">
      {/* Header with slot count controls */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Layers className="w-3 h-3" />
          {t('palette.amsSlots')}
          <span className="text-gray-600">({amsSlots.length})</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={removeSlot}
            disabled={amsSlots.length <= 1}
            className="p-1 rounded-md hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={t('palette.removeSlot')}
          >
            <Minus className="w-3 h-3 text-gray-400" />
          </button>
          <button
            onClick={addSlot}
            disabled={amsSlots.length >= 8}
            className="p-1 rounded-md hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title={t('palette.addSlot')}
          >
            <Plus className="w-3 h-3 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Slot selectors */}
      <div className="space-y-1.5">
        {amsSlots.map((slot, idx) => (
          <div key={slot.slot} className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <SlotSelector
                slotNumber={slot.slot}
                currentFilament={slot.filament}
                library={library}
                onSelect={(f) => assignSlot(slot.slot, f)}
              />
            </div>
            {/* Eye-toggle: show/hide this layer in the 3D preview */}
            {hasLayerData && idx < (paletteMeshSet?.entries.length ?? 0) && (
              <button
                onClick={() => togglePaletteLayer(idx)}
                className={cn(
                  "p-1.5 rounded-lg transition-all shrink-0",
                  paletteLayerVisibility[idx] !== false
                    ? "text-indigo-400 hover:bg-indigo-500/15"
                    : "text-gray-600 hover:bg-white/5"
                )}
                title={paletteLayerVisibility[idx] !== false ? 'Hide layer' : 'Show layer'}
              >
                {paletteLayerVisibility[idx] !== false
                  ? <Eye className="w-3.5 h-3.5" />
                  : <EyeOff className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* No white warning */}
      {!hasWhite && (
        <div className="flex gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[9px] text-amber-300/80 leading-relaxed">
            {t('palette.noWhiteWarning')}
          </p>
        </div>
      )}

      {/* Print parameters */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Settings2 className="w-3 h-3" />
          {t('palette.printParams')}
        </label>

        {/* Max layers */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{t('palette.maxLayers')}</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={maxLayers}
              onChange={e => setMaxLayers(Number(e.target.value))}
              className="w-20 h-1 accent-indigo-500"
            />
            <span className="text-[10px] font-mono text-white w-4 text-right">{maxLayers}</span>
          </div>
        </div>

        {/* Layer height */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{t('palette.layerHeight')}</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.04}
              max={0.32}
              step={0.02}
              value={layerHeight}
              onChange={e => setLayerHeight(Number(e.target.value))}
              className="w-20 h-1 accent-indigo-500"
            />
            <span className="text-[10px] font-mono text-white w-10 text-right">{layerHeight.toFixed(2)} mm</span>
          </div>
        </div>
      </div>

      {/* Manage library button */}
      <button
        onClick={() => setManagerOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-medium rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all"
      >
        <Beaker className="w-3 h-3" />
        {t('palette.manageLibrary')}
      </button>
    </div>
  );
}
