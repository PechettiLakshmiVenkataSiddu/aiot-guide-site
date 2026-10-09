import React from 'react';
import { Home, Compass, Cpu, MessageSquareQuote, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSensory } from '../context/useSensory';

export type TabType = 'home' | 'roadmap' | 'projects' | 'ask' | 'progress';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { playFeedback } = useSensory();

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'roadmap', label: 'Roadmap', icon: Compass },
    { id: 'projects', label: 'Projects', icon: Cpu },
    { id: 'ask', label: 'Ask AI', icon: MessageSquareQuote },
    { id: 'progress', label: 'Progress', icon: CheckCircle2 }
  ];

  const handleSelect = (tab: TabType) => {
    if (tab !== activeTab) {
      playFeedback('tap', 'tap');
      onChangeTab(tab);
    }
  };

  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 pb-[max(env(safe-area-inset-bottom),8px)] pt-2"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-colors select-none focus:outline-none"
              aria-label={item.label}
              aria-selected={isActive}
            >
              {/* Active pill background with spring layout */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-tight ${
                    isActive ? 'text-cyan-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
