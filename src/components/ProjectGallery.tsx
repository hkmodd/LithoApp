/**
 * ProjectGallery — modal overlay showing saved project history.
 *
 * Grid of cards with thumbnails, project name, date, mode badge.
 * Tap to restore, button to delete, rename via double-click.
 * Glassmorphism styling matching the existing LithoApp UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Clock,
  Image as ImageIcon,
  Box,
  Palette,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { useProjectStore, type ProjectSlot } from '../store/useProjectStore';
import { useTranslation } from '../i18n';

interface ProjectGalleryProps {
  open: boolean;
  onClose: () => void;
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format ISO date to locale-friendly string */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16);
  }
}

/** Mode badge icon + color */
function ModeBadge({ mode }: { mode: string }) {
  const modeConfig = {
    lithophane: { icon: ImageIcon, label: 'Litho', color: 'text-blue-400 bg-blue-500/20' },
    extrusion: { icon: Box, label: 'Extrude', color: 'text-amber-400 bg-amber-500/20' },
    'color-litho': { icon: Palette, label: 'Color', color: 'text-purple-400 bg-purple-500/20' },
  };
  const cfg = modeConfig[mode as keyof typeof modeConfig] || modeConfig.lithophane;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${cfg.color}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

/** A single project card in the gallery grid */
function ProjectCard({
  slot,
  onRestore,
  onDelete,
  onRename,
}: {
  slot: ProjectSlot;
  onRestore: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(slot.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitRename = () => {
    setIsEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== slot.name) {
      onRename(trimmed);
    } else {
      setEditName(slot.name);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
      onClick={onRestore}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
        {slot.thumbnail ? (
          <img
            src={slot.thumbnail}
            alt={slot.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-gray-700" />
        )}
      </div>

      {/* Info overlay */}
      <div className="p-2.5 space-y-1">
        {/* Name — double-click to rename */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-blue-400"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setEditName(slot.name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className="text-[11px] font-medium text-gray-200 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title={`${slot.name} — ${t('gallery.rename')}`}
          >
            {slot.name}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <Clock className="w-2.5 h-2.5" />
            {formatDate(slot.savedAt)}
          </span>
          <ModeBadge mode={slot.mode} />
        </div>
      </div>

      {/* Delete button — appears on hover */}
      <button
        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/20 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={t('gallery.delete')}
        title={t('gallery.delete')}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

/** Main gallery modal */
export default function ProjectGallery({ open, onClose }: ProjectGalleryProps) {
  const {
    projectHistory,
    historyLoaded,
    loadHistory,
    loadFromHistory,
    deleteFromHistory,
    renameHistorySlot,
    clearAllHistory,
    getCacheUsageBytes,
    isDirty,
  } = useProjectStore();
  const { t } = useTranslation();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  // Load history index on first open
  useEffect(() => {
    if (open && !historyLoaded) {
      loadHistory();
    }
  }, [open, historyLoaded, loadHistory]);

  // Reset confirm states when closing
  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      setConfirmRestore(null);
    }
  }, [open]);

  const handleRestore = useCallback(
    async (id: string) => {
      // If project is dirty, ask for confirmation first
      if (isDirty && confirmRestore !== id) {
        setConfirmRestore(id);
        return;
      }
      const ok = await loadFromHistory(id);
      if (ok) onClose();
      setConfirmRestore(null);
    },
    [isDirty, confirmRestore, loadFromHistory, onClose]
  );

  const handleClearAll = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAllHistory();
    setConfirmClear(false);
  }, [confirmClear, clearAllHistory]);

  const cacheUsage = getCacheUsageBytes();
  const cacheLabel = t('gallery.cacheUsage')
    .replace('{used}', formatBytes(cacheUsage))
    .replace('{limit}', '50 MB');

  // Sort newest first for display
  const sortedHistory = [...projectHistory].reverse();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[61] flex flex-col bg-gradient-to-br from-[#0a0a0a]/95 to-[#111]/95 backdrop-blur-3xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">
                    {t('gallery.title')}
                  </h2>
                  <p className="text-[10px] text-gray-500">{cacheLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sortedHistory.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      confirmClear
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {confirmClear ? t('gallery.clearConfirm') : t('gallery.clearAll')}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Restore confirmation bar */}
            <AnimatePresence>
              {confirmRestore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-[11px] text-amber-200/80 flex-1">
                      {t('gallery.restoreConfirm')}
                    </p>
                    <button
                      onClick={() => handleRestore(confirmRestore)}
                      className="text-[10px] font-semibold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                    >
                      {t('gallery.confirm')}
                    </button>
                    <button
                      onClick={() => setConfirmRestore(null)}
                      className="text-[10px] px-2 py-1 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                      {t('gallery.cancel')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {sortedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                  <FolderOpen className="w-10 h-10 text-gray-600" />
                  <p className="text-sm text-gray-500">{t('gallery.empty')}</p>
                  <p className="text-[10px] text-gray-600 max-w-[200px]">
                    {t('gallery.emptyHint')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {sortedHistory.map((slot) => (
                      <ProjectCard
                        key={slot.id}
                        slot={slot}
                        onRestore={() => handleRestore(slot.id)}
                        onDelete={() => deleteFromHistory(slot.id)}
                        onRename={(name) => renameHistorySlot(slot.id, name)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
