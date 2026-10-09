import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSensory } from '../context/useSensory';
import guideData from '../data/guideData.json';
import {
  Flame,
  Cpu,
  Sparkles,
  Compass,
  Award
} from 'lucide-react';
import { fireProjectConfetti } from '../utils/confetti';

const STORAGE_KEY_CHECKLISTS = 'aiot_project_checklists';
const STORAGE_KEY_MILESTONES = 'aiot_milestone_checks';
const STORAGE_KEY_STREAK = 'aiot_streak_data';

export const ProgressPage: React.FC = () => {
  const { playFeedback } = useSensory();
  
  const [projectChecks] = useState<Record<string, boolean>>(() => {
    try {
      const pData = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
      return pData ? JSON.parse(pData) : {};
    } catch {
      return {};
    }
  });

  const [milestoneChecks] = useState<Record<string, boolean>>(() => {
    try {
      const mData = localStorage.getItem(STORAGE_KEY_MILESTONES);
      return mData ? JSON.parse(mData) : {};
    } catch {
      return {};
    }
  });

  const [streakCount] = useState<number>(() => {
    try {
      const sData = localStorage.getItem(STORAGE_KEY_STREAK);
      if (sData) {
        const parsed = JSON.parse(sData);
        return parsed.streak || 3;
      }
      localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify({ streak: 3, lastDate: new Date().toISOString() }));
      return 3;
    } catch {
      return 3;
    }
  });

  // Compute Hardware Projects Completed
  let totalHwSteps = 0;
  let doneHwSteps = 0;
  let completedHwProjects = 0;

  guideData.hardwareProjects.forEach(p => {
    totalHwSteps += p.steps.length;
    let projStepsDone = 0;
    p.steps.forEach((_, i) => {
      if (projectChecks[`${p.id}_step_${i}`]) {
        doneHwSteps++;
        projStepsDone++;
      }
    });
    if (projStepsDone === p.steps.length && p.steps.length > 0) {
      completedHwProjects++;
    }
  });

  const hwPercent = Math.round((doneHwSteps / (totalHwSteps || 1)) * 100);

  // Compute Sunday AI Projects Completed
  let totalSundaySteps = 0;
  let doneSundaySteps = 0;
  let completedSundayProjects = 0;

  guideData.sundayProjects.forEach(p => {
    totalSundaySteps += p.features.length;
    let pDone = 0;
    p.features.forEach((_, i) => {
      if (projectChecks[`${p.id}_step_${i}`]) {
        doneSundaySteps++;
        pDone++;
      }
    });
    if (pDone === p.features.length && p.features.length > 0) {
      completedSundayProjects++;
    }
  });

  const sundayPercent = Math.round((doneSundaySteps / (totalSundaySteps || 1)) * 100);

  // Compute Milestones Completed
  const totalMilestones = guideData.milestones.reduce((acc, m) => acc + m.items.length, 0);
  const doneMilestones = Object.values(milestoneChecks).filter(Boolean).length;
  const milestonePercent = Math.round((doneMilestones / (totalMilestones || 1)) * 100);

  // Overall Score
  const overallScore = Math.round((hwPercent * 0.45) + (sundayPercent * 0.35) + (milestonePercent * 0.20));

  const triggerCelebration = () => {
    fireProjectConfetti();
    playFeedback('project-done', 'project-done');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header Overview & Streak */}
      <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-0.5">
              Accountability Tracker
            </span>
            <h1 className="text-xl font-extrabold text-white">Study Progression</h1>
          </div>

          {/* Flame Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-bounce" />
            <span className="text-xs font-bold font-mono">{streakCount} Day Streak</span>
          </div>
        </div>

        {/* Big Overall Metric Ring */}
        <div className="mt-5 flex items-center justify-around">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#progressGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * overallScore) / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">{overallScore}%</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Overall</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-300">Hardware Projects:</span>
              <span className="font-bold text-white ml-auto">{completedHwProjects} / 10</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Sunday AI Apps:</span>
              <span className="font-bold text-white ml-auto">{completedSundayProjects} / 12</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span className="text-slate-300">Roadmap Milestones:</span>
              <span className="font-bold text-white ml-auto">{doneMilestones} / {totalMilestones}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Progress Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Hardware AIoT Card */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300">{hwPercent}%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Hardware AIoT</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{doneHwSteps} of {totalHwSteps} steps completed</p>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${hwPercent}%` }} />
          </div>
        </div>

        {/* Sunday Projects Card */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300">{sundayPercent}%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sunday AI Apps</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{doneSundaySteps} of {totalSundaySteps} features completed</p>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${sundayPercent}%` }} />
          </div>
        </div>

        {/* Monthly Milestones Card */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-purple-300">{milestonePercent}%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Milestones</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{doneMilestones} of {totalMilestones} targets reached</p>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-400 h-full rounded-full transition-all duration-500" style={{ width: `${milestonePercent}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Celebration & Sensory Controls Quick Card */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Trigger Confetti & Chime</div>
            <div className="text-[10px] text-slate-400">Preview victory celebration effects</div>
          </div>
        </div>

        <button
          onClick={triggerCelebration}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition-all"
        >
          Celebrate!
        </button>
      </div>
    </div>
  );
};
