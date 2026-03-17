import { memo } from 'react';
import { Eye, ImageIcon, Hexagon, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { motion } from 'motion/react';
import { tap } from '../lib/haptics';

export type MobileTab = 'view' | 'image' | 'mesh' | 'export';

interface MobileNavBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasMesh: boolean;
}

const tabs: { id: MobileTab; icon: typeof ImageIcon; labelKey: string }[] = [
  { id: 'view', icon: Eye, labelKey: 'nav.preview' },
  { id: 'image', icon: ImageIcon, labelKey: 'nav.image' },
  { id: 'mesh', icon: Hexagon, labelKey: 'nav.geometry' },
  { id: 'export', icon: Download, labelKey: 'nav.export' },
];

export default memo(function MobileNavBar({ activeTab, onTabChange, hasMesh }: MobileNavBarProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="relative z-50 flex items-end bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/8"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ id, icon: Icon, labelKey }) => {
        const isActive = activeTab === id;
        // Mesh and Export tabs are disabled until mesh is generated
        const isDisabled = (id === 'view' || id === 'mesh' || id === 'export') && !hasMesh;

        return (
          <button
            key={id}
            onClick={() => { if (!isDisabled) { tap(); onTabChange(id); } }}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-75 relative",
              isActive ? "text-[#2563EB]" : "text-gray-500",
              isDisabled && "opacity-30 pointer-events-none"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavIndicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#2563EB] rounded-full"
                transition={{ type: "spring", stiffness: 700, damping: 35 }}
              />
            )}
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.5} />
            <span className={cn(
              "text-[9px] font-mono uppercase tracking-wider",
              isActive ? "text-[#2563EB]" : "text-gray-600"
            )}>
              {t(labelKey as any)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
);
