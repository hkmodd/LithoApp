import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Search, Trash2, RotateCcw, Upload, Download, Beaker } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { usePaletteStore } from '../store/usePaletteStore';
import { createFilament, exportFilamentLibrary, importFilamentLibrary } from '../models/filamentPalette';
import type { Filament } from '../models/filamentPalette';

/** Backdrop + slide-up modal for managing the filament library */
export default function FilamentManager() {
  const { t } = useTranslation();
  const isOpen = usePaletteStore(s => s.isManagerOpen);
  const setOpen = usePaletteStore(s => s.setManagerOpen);
  const library = usePaletteStore(s => s.filamentLibrary);
  const search = usePaletteStore(s => s.searchFilter);
  const setSearch = usePaletteStore(s => s.setSearchFilter);
  const addFilament = usePaletteStore(s => s.addFilament);
  const removeFilament = usePaletteStore(s => s.removeFilament);
  const updateFilament = usePaletteStore(s => s.updateFilament);
  const resetLibrary = usePaletteStore(s => s.resetLibrary);

  // ── Add-filament form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#808080');
  const [newTd, setNewTd] = useState('2.0');
  const [newBrand, setNewBrand] = useState('');
  const [newMaterial, setNewMaterial] = useState('PLA');

  // ── Inline TD editing state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTd, setEditTd] = useState('');

  // ── Filtered list ──
  const filtered = useMemo(() => {
    if (!search.trim()) return library;
    const lower = search.toLowerCase();
    return library.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.brand.toLowerCase().includes(lower) ||
      f.material.toLowerCase().includes(lower)
    );
  }, [library, search]);

  // ── Group by brand ──
  const grouped = useMemo(() => {
    const map = new Map<string, Filament[]>();
    for (const f of filtered) {
      const group = map.get(f.brand) ?? [];
      group.push(f);
      map.set(f.brand, group);
    }
    return map;
  }, [filtered]);

  // ── Handlers ──
  const handleAdd = () => {
    if (!newName.trim()) return;
    const td = parseFloat(newTd);
    if (isNaN(td) || td <= 0) return;
    addFilament(createFilament({
      name: newName.trim(),
      hexColor: newHex,
      td,
      brand: newBrand.trim() || 'Custom',
      material: newMaterial.trim() || 'PLA',
    }));
    setNewName('');
    setNewHex('#808080');
    setNewTd('2.0');
    setNewBrand('');
    setNewMaterial('PLA');
    setShowAddForm(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = importFilamentLibrary(text);
        for (const f of imported) {
          if (!library.find(existing => existing.id === f.id)) {
            addFilament(f);
          }
        }
      } catch (err) {
        console.error('Filament import failed:', err);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const json = exportFilamentLibrary(library);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lithoapp-filaments.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleTdSave = (id: string) => {
    const val = parseFloat(editTd);
    if (!isNaN(val) && val > 0) {
      updateFilament(id, { td: val, isCalibrated: true });
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-4 sm:inset-x-auto sm:inset-y-8 sm:mx-auto sm:max-w-lg z-50 rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">{t('palette.filamentLibrary')}</h2>
                <span className="text-[10px] text-gray-500 font-mono">{library.length}</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('palette.search')}
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button onClick={() => setShowAddForm(!showAddForm)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={t('palette.addFilament')}>
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button onClick={handleImport} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={t('palette.import')}>
                <Upload className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={t('palette.export')}>
                <Download className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button onClick={resetLibrary} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={t('palette.resetLibrary')}>
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* ── Add Filament Form (collapsible) ── */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/5"
                >
                  <div className="px-5 py-3 space-y-2">
                    <div className="grid grid-cols-[1fr_60px] gap-2">
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder={t('palette.name')}
                        className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="color"
                        value={newHex}
                        onChange={e => setNewHex(e.target.value)}
                        className="w-full h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={newTd}
                        onChange={e => setNewTd(e.target.value)}
                        placeholder="TD (mm)"
                        className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        value={newBrand}
                        onChange={e => setNewBrand(e.target.value)}
                        placeholder={t('palette.brand')}
                        className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        value={newMaterial}
                        onChange={e => setNewMaterial(e.target.value)}
                        placeholder={t('palette.material')}
                        className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      disabled={!newName.trim()}
                      className="w-full py-1.5 text-[11px] font-medium rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {t('palette.addFilament')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Filament List (scrollable, grouped by brand) ── */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 scrollbar-thin">
              {[...grouped.entries()].map(([brand, filaments]) => (
                <div key={brand}>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600 mb-1.5">{brand}</div>
                  <div className="space-y-1">
                    {filaments.map(f => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                      >
                        {/* Colour swatch */}
                        <span
                          className="w-5 h-5 rounded-md border border-white/10 shrink-0 shadow-inner"
                          style={{ backgroundColor: f.hexColor }}
                        />

                        {/* Name + material */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-white truncate">{f.name}</div>
                          <div className="text-[9px] text-gray-500">{f.material}</div>
                        </div>

                        {/* TD value — inline edit on click */}
                        {editingId === f.id ? (
                          <input
                            value={editTd}
                            onChange={e => setEditTd(e.target.value)}
                            onBlur={() => handleTdSave(f.id)}
                            onKeyDown={e => e.key === 'Enter' && handleTdSave(f.id)}
                            autoFocus
                            className="w-14 px-1.5 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/40 rounded text-indigo-300 text-center focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(f.id); setEditTd(f.td.toString()); }}
                            className="px-2 py-0.5 text-[10px] font-mono text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-colors"
                            title={t('palette.editTd')}
                          >
                            TD {f.td.toFixed(1)}
                          </button>
                        )}

                        {/* Calibrated indicator */}
                        {f.isCalibrated && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title={t('palette.calibrated')} />
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => removeFilament(f.id)}
                          className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                          title={t('palette.deleteFilament')}
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center text-[11px] text-gray-500 py-8">
                  {search.trim() ? t('palette.noResults') : t('palette.emptyLibrary')}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
