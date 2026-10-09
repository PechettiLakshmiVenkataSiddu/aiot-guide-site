import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSensory } from '../context/useSensory';
import guideData from '../data/guideData.json';
import { CodeBlock } from '../components/CodeBlock';
import { fireProjectConfetti } from '../utils/confetti';
import {
  Cpu,
  Sparkles,
  Layers,
  Clock,
  Gauge,
  CheckCircle2,
  Circle,
  X,
  Play,
  MessageSquareQuote,
  Zap,
  Wrench
} from 'lucide-react';

interface ProjectsPageProps {
  initialFilter?: 'hardware' | 'sunday' | 'arch';
  onAskProject: (projectId: string, projectTitle: string) => void;
}

const STORAGE_KEY_CHECKLISTS = 'aiot_project_checklists';

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  initialFilter = 'hardware',
  onAskProject
}) => {
  const { playFeedback } = useSensory();
  const [filter, setFilter] = useState<'hardware' | 'sunday' | 'arch'>(initialFilter);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklist = (key: string, totalCount?: number, projectKey?: string) => {
    const next = !checklistState[key];
    const updated = { ...checklistState, [key]: next };
    setChecklistState(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (next) {
      playFeedback('step-done', 'step-done');
      // If all items for this project completed, trigger confetti!
      if (projectKey && totalCount) {
        let done = 0;
        for (let i = 0; i < totalCount; i++) {
          if (updated[`${projectKey}_step_${i}`]) done++;
        }
        if (done === totalCount) {
          fireProjectConfetti();
          playFeedback('project-done', 'project-done');
        }
      }
    } else {
      playFeedback('tap', 'tap');
    }
  };

  const getProjectProgress = (projId: string, stepCount: number) => {
    if (!stepCount) return 0;
    let done = 0;
    for (let i = 0; i < stepCount; i++) {
      if (checklistState[`${projId}_step_${i}`]) done++;
    }
    return Math.round((done / stepCount) * 100);
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel border border-slate-800">
        <button
          onClick={() => {
            playFeedback('tap', 'tap');
            setFilter('hardware');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            filter === 'hardware'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Hardware (10)</span>
        </button>

        <button
          onClick={() => {
            playFeedback('tap', 'tap');
            setFilter('sunday');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            filter === 'sunday'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sunday AI (12)</span>
        </button>

        <button
          onClick={() => {
            playFeedback('tap', 'tap');
            setFilter('arch');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            filter === 'arch'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Arch (5)</span>
        </button>
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Hardware AIoT Projects */}
        {filter === 'hardware' &&
          guideData.hardwareProjects.map((p, index) => {
            const progress = getProjectProgress(p.id, p.steps.length);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                onClick={() => {
                  playFeedback('tap', 'tap');
                  setSelectedProject({ ...p, type: 'hardware' });
                }}
                className="p-4 rounded-2xl glass-panel border border-slate-800 hover:border-cyan-500/40 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
              >
                {/* Progress highlight bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-emerald-400"
                  style={{ opacity: progress > 0 ? 1 : 0.2 }}
                />

                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/40">
                      PROJECT {p.number}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {p.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        {p.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {p.steps.length} Steps &bull; Python + Hardware
                    </span>
                    <span className={`text-[11px] font-semibold ${progress === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                      {progress}% Done
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

        {/* Sunday AI Projects */}
        {filter === 'sunday' &&
          guideData.sundayProjects.map((p, index) => {
            const progress = getProjectProgress(p.id, p.features.length);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                onClick={() => {
                  playFeedback('tap', 'tap');
                  setSelectedProject({ ...p, type: 'sunday' });
                }}
                className="p-4 rounded-2xl glass-panel border border-slate-800 hover:border-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-400"
                  style={{ opacity: progress > 0 ? 1 : 0.2 }}
                />

                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      MONTH {p.month} &bull; {p.week}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {p.repoName}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {p.tools.slice(0, 3).map((tool, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {tool}
                        </span>
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold ${progress === 100 ? 'text-emerald-400' : 'text-emerald-400'}`}>
                      {progress}% Done
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

        {/* Architectures */}
        {filter === 'arch' &&
          guideData.architectures.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              onClick={() => {
                playFeedback('tap', 'tap');
                setSelectedProject({ ...p, type: 'arch' });
              }}
              className="p-4 rounded-2xl glass-panel border border-slate-800 hover:border-purple-500/40 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/40">
                  ARCHITECTURE {p.number}
                </span>
                <span className="text-[10px] text-slate-400">Appendix I</span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                {p.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-slate-300">Problem:</strong> {p.problem}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-purple-300">Solution:</strong> {p.solution}
              </p>
            </motion.div>
          ))}
      </div>

      {/* Project Detail Slide-over / Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[10px] font-mono font-bold text-cyan-400">
                    {selectedProject.type === 'hardware'
                      ? `Project ${selectedProject.number}`
                      : selectedProject.type === 'sunday'
                      ? selectedProject.week
                      : `Architecture ${selectedProject.number}`}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate max-w-[240px]">
                    {selectedProject.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      playFeedback('tap', 'tap');
                      onAskProject(selectedProject.id, selectedProject.title);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-900"
                    title="Ask AI about this project"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>Ask AI</span>
                  </button>

                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300 pb-12">
                {/* Hardware Project Content */}
                {selectedProject.type === 'hardware' && (
                  <>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedProject.description}
                    </p>

                    {/* Meta stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Estimated Build Time</span>
                        <span className="text-white font-semibold text-xs flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          {selectedProject.time}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Difficulty Level</span>
                        <span className="text-white font-semibold text-xs flex items-center gap-1 mt-0.5">
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          {selectedProject.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Hardware Bill of Materials */}
                    {selectedProject.hardware && selectedProject.hardware.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          Hardware Required
                        </h4>
                        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          {selectedProject.hardware.map((hw: string, i: number) => {
                            const hwKey = `${selectedProject.id}_hw_${i}`;
                            const isChecked = Boolean(checklistState[hwKey]);
                            return (
                              <div
                                key={i}
                                onClick={() => toggleChecklist(hwKey)}
                                className="flex items-center gap-2 cursor-pointer select-none"
                              >
                                {isChecked ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                )}
                                <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-200'}>
                                  {hw}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Wiring Pinout */}
                    {selectedProject.wiring && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          Wiring & Connections
                        </h4>
                        <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap">
                          {selectedProject.wiring}
                        </pre>
                      </div>
                    )}

                    {/* Step-by-Step Interactive Build Checklist */}
                    {selectedProject.steps && selectedProject.steps.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Step-by-Step Build Guide
                        </h4>
                        <div className="space-y-2">
                          {selectedProject.steps.map((step: string, i: number) => {
                            const stepKey = `${selectedProject.id}_step_${i}`;
                            const isChecked = Boolean(checklistState[stepKey]);
                            return (
                              <div
                                key={i}
                                onClick={() =>
                                  toggleChecklist(stepKey, selectedProject.steps.length, selectedProject.id)
                                }
                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all active:scale-[0.98] ${
                                  isChecked
                                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isChecked ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-500" />
                                  )}
                                </div>
                                <span className={isChecked ? 'line-through opacity-70' : ''}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Core Code Block */}
                    {selectedProject.code && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Core Tested Code
                        </h4>
                        <CodeBlock code={selectedProject.code} language="python" filename={`project_${selectedProject.number}.py`} />
                      </div>
                    )}

                    {/* Embedded YouTube Reference */}
                    {selectedProject.videoReferences && selectedProject.videoReferences.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5" />
                          Video Reference
                        </h4>
                        {selectedProject.videoReferences.map((vUrl: string, i: number) => {
                          const vId = extractYouTubeId(vUrl);
                          return (
                            <div key={i} className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                              {vId ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${vId}`}
                                  title="YouTube Video Reference"
                                  className="w-full aspect-video border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <div className="p-3 text-xs text-slate-400">
                                  Link: <a href={vUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{vUrl}</a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* What you learn */}
                    {selectedProject.whatYouLearn && selectedProject.whatYouLearn.length > 0 && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          What You Learn
                        </h4>
                        <ul className="space-y-1">
                          {selectedProject.whatYouLearn.map((pt: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-slate-300">
                              <span className="text-cyan-400">&bull;</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Sunday AI Project Content */}
                {selectedProject.type === 'sunday' && (
                  <>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedProject.description}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400">Portfolio GitHub Repository</div>
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        github.com/username/{selectedProject.repoName}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Feature Checklist
                      </h4>
                      <div className="space-y-2">
                        {selectedProject.features.map((feat: string, i: number) => {
                          const stepKey = `${selectedProject.id}_step_${i}`;
                          const isChecked = Boolean(checklistState[stepKey]);
                          return (
                            <div
                              key={i}
                              onClick={() =>
                                toggleChecklist(stepKey, selectedProject.features.length, selectedProject.id)
                              }
                              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all active:scale-[0.98] ${
                                isChecked
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isChecked ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                              <span className={isChecked ? 'line-through opacity-70' : ''}>
                                {feat}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Architecture Content */}
                {selectedProject.type === 'arch' && (
                  <>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div>
                        <strong className="text-slate-300 block text-xs">Problem:</strong>
                        <p className="text-slate-400 mt-0.5">{selectedProject.problem}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-800">
                        <strong className="text-purple-300 block text-xs">Architectural Solution:</strong>
                        <p className="text-slate-300 mt-0.5">{selectedProject.solution}</p>
                      </div>
                    </div>

                    {selectedProject.dataFlow && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          Data Flow Pipeline
                        </h4>
                        <div className="p-3 rounded-xl bg-slate-950 border border-purple-900/40 text-xs font-mono text-purple-300">
                          {selectedProject.dataFlow}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Full Architecture Specification
                      </h4>
                      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedProject.rawContent}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
