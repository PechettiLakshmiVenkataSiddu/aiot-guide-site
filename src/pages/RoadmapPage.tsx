import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSensory } from '../context/useSensory';
import guideData from '../data/guideData.json';
import { Compass, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { fireProjectConfetti } from '../utils/confetti';

const STORAGE_KEY = 'aiot_milestone_checks';

export const RoadmapPage: React.FC = () => {
  const { playFeedback } = useSensory();
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [expandedMonth, setExpandedMonth] = useState<number>(1);

  const toggleItem = (itemKey: string) => {
    const next = !completedItems[itemKey];
    const updated = { ...completedItems, [itemKey]: next };
    setCompletedItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (next) {
      playFeedback('step-done', 'step-done');
      // Check if all items in month complete
      const totalChecks = Object.values(updated).filter(Boolean).length;
      if (totalChecks % 6 === 0) {
        fireProjectConfetti();
        playFeedback('project-done', 'project-done');
      }
    } else {
      playFeedback('tap', 'tap');
    }
  };

  const totalMilestones = guideData.milestones.reduce((acc, m) => acc + m.items.length, 0);
  const totalCompleted = Object.values(completedItems).filter(Boolean).length;
  const progressPct = Math.round((totalCompleted / totalMilestones) * 100);

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">4-Month Study Roadmap</h1>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800">
            {progressPct}% Completed
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-4 max-w-sm">
          A structured 16-week accountability progression taking you from zero to remote edge AI internship & Japan interview ready.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {/* Timeline Months */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-teal-500 before:to-emerald-500">
        {guideData.milestones.map((m) => {
          const isExpanded = expandedMonth === m.month;
          const monthCompletedCount = m.items.filter((_, idx) => completedItems[`m${m.month}_i${idx}`]).length;
          const isMonthDone = monthCompletedCount === m.items.length;

          return (
            <motion.div
              key={m.month}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: m.month * 0.1 }}
              className="relative"
            >
              {/* Timeline Marker Dot */}
              <div
                className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                  isMonthDone
                    ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                    : 'bg-slate-950 border-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.5)]'
                }`}
              >
                {isMonthDone && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
              </div>

              {/* Month Card */}
              <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
                <button
                  onClick={() => {
                    playFeedback('tap', 'tap');
                    setExpandedMonth(isExpanded ? 0 : m.month);
                  }}
                  className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      M{m.month}
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-white">{m.title}</h2>
                      <div className="text-[11px] text-slate-400">
                        {monthCompletedCount} / {m.items.length} Milestones Achieved
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-800/80 bg-slate-950/40">
                    {m.items.map((item, idx) => {
                      const itemKey = `m${m.month}_i${idx}`;
                      const isChecked = Boolean(completedItems[itemKey]);

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItem(itemKey)}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all active:scale-[0.98] ${
                            isChecked
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <span className={`text-xs ${isChecked ? 'line-through opacity-70' : ''}`}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
