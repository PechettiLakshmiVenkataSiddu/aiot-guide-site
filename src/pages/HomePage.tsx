import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircuitHero } from '../components/CircuitHero';
import { useSensory } from '../context/useSensory';
import { CodeBlock } from '../components/CodeBlock';
import guideData from '../data/guideData.json';
import {
  BookOpen,
  Terminal,
  Languages,
  FileText,
  ChevronRight,
  Sparkles,
  Search,
  Cpu,
  GraduationCap
} from 'lucide-react';

interface HomePageProps {
  onNavigateToProjects: (filter?: 'hardware' | 'sunday' | 'arch') => void;
  onNavigateToRoadmap: () => void;
  onNavigateToAsk: (initialQuery?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToProjects,
  onNavigateToRoadmap,
  onNavigateToAsk
}) => {
  const { playFeedback } = useSensory();
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [activeTabResource, setActiveTabResource] = useState<'chapters' | 'dsa' | 'japanese' | 'english' | 'glossary'>('chapters');
  const [glossaryQuery, setGlossaryQuery] = useState('');

  const filteredGlossary = guideData.glossary.filter(g =>
    g.term.toLowerCase().includes(glossaryQuery.toLowerCase()) ||
    g.definition.toLowerCase().includes(glossaryQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Animated Circuit Hero */}
      <CircuitHero />

      {/* 2. Career Roadmap Milestone Banner (2025 - 2033) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-panel p-4 rounded-2xl border border-slate-800 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Personalized Career Journey
            </h2>
          </div>
          <button
            onClick={() => {
              playFeedback('tap', 'tap');
              onNavigateToRoadmap();
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            <span>Full Timeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Milestone Steps Bar */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-cyan-500/30">
            <div className="font-mono text-[10px] text-cyan-400 font-bold">2025</div>
            <div className="text-[11px] font-semibold text-slate-200 mt-0.5">B.Tech CS-IT</div>
            <div className="text-[9px] text-slate-400">Malla Reddy</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-mono text-[10px] text-teal-400 font-bold">2026</div>
            <div className="text-[11px] font-semibold text-slate-200 mt-0.5">Internship</div>
            <div className="text-[9px] text-slate-400">Remote Edge AI</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-mono text-[10px] text-emerald-400 font-bold">2029</div>
            <div className="text-[11px] font-semibold text-slate-200 mt-0.5">Japan AIoT</div>
            <div className="text-[9px] text-slate-400">Panasonic / Omron</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="font-mono text-[10px] text-amber-400 font-bold">2033</div>
            <div className="text-[11px] font-semibold text-slate-200 mt-0.5">Vizag Startup</div>
            <div className="text-[9px] text-slate-400">Indo-Japan Tech</div>
          </div>
        </div>
      </motion.div>

      {/* 3. Quick Action Hub */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            playFeedback('tap', 'tap');
            onNavigateToProjects('hardware');
          }}
          className="p-3.5 rounded-2xl glass-panel text-left border border-slate-800 hover:border-cyan-500/40 active:scale-95 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-110 transition-transform">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-white">10 Hardware AIoT</div>
          <div className="text-[11px] text-slate-400">Step guides, wiring & code</div>
        </button>

        <button
          onClick={() => {
            playFeedback('tap', 'tap');
            onNavigateToProjects('sunday');
          }}
          className="p-3.5 rounded-2xl glass-panel text-left border border-slate-800 hover:border-emerald-500/40 active:scale-95 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-white">12 Sunday AI Apps</div>
          <div className="text-[11px] text-slate-400">4-Month portfolio builder</div>
        </button>
      </div>

      {/* 4. Knowledge Repository Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => { playFeedback('tap', 'tap'); setActiveTabResource('chapters'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTabResource === 'chapters'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
            12 Chapters
          </button>
          <button
            onClick={() => { playFeedback('tap', 'tap'); setActiveTabResource('dsa'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTabResource === 'dsa'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1" />
            DSA Patterns
          </button>
          <button
            onClick={() => { playFeedback('tap', 'tap'); setActiveTabResource('japanese'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTabResource === 'japanese'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Languages className="w-3.5 h-3.5 inline mr-1" />
            JLPT N4
          </button>
          <button
            onClick={() => { playFeedback('tap', 'tap'); setActiveTabResource('english'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTabResource === 'english'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Technical English
          </button>
          <button
            onClick={() => { playFeedback('tap', 'tap'); setActiveTabResource('glossary'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTabResource === 'glossary'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Glossary
          </button>
        </div>

        {/* Tab 1: 12 Chapters Overview */}
        {activeTabResource === 'chapters' && (
          <div className="space-y-2.5">
            {guideData.chapters.map((ch) => (
              <div
                key={ch.number}
                className="rounded-2xl glass-panel border border-slate-800/90 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => {
                    playFeedback('tap', 'tap');
                    setSelectedChapter(selectedChapter === ch.number ? null : ch.number);
                  }}
                  className="w-full p-3.5 text-left flex items-start justify-between gap-3 focus:outline-none"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {ch.number}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{ch.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ch.summary}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                      selectedChapter === ch.number ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {selectedChapter === ch.number && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/40 text-xs space-y-3"
                    >
                      <div className="text-slate-300 leading-relaxed">{ch.summary}</div>
                      
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">Key Takeaways:</span>
                        <ul className="space-y-1 text-slate-300">
                          {ch.keyPoints.map((kp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Pages: {ch.pages}</span>
                        <button
                          onClick={() => {
                            playFeedback('tap', 'tap');
                            onNavigateToAsk(`Explain key concepts from Chapter ${ch.number}: ${ch.title}`);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Ask AI about this chapter &rarr;
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: DSA Patterns */}
        {activeTabResource === 'dsa' && (
          <div className="space-y-3">
            {guideData.dsaPatterns.map((dp) => (
              <div key={dp.id} className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{dp.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                    {dp.complexity}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{dp.useWhen}</p>
                <CodeBlock code={dp.code} language="cpp" filename={`${dp.id}.cpp`} />
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Japanese JLPT N4 */}
        {activeTabResource === 'japanese' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-emerald-400">JLPT N4 Study Track:</span> Engineering & AIoT contextual phrases for Japan career target (2029).
            </div>
            {guideData.japaneseGrammar.map((jg, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl glass-panel border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-cyan-300 font-mono">{jg.pattern}</h4>
                  <span className="text-[11px] text-slate-400">{jg.meaning}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                  <div className="text-white font-medium text-sm">{jg.example}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{jg.translation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Technical English Guide */}
        {activeTabResource === 'english' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-amber-400">Common Writing Fixes:</span> Tailored for international technical documentation, resumes, and interview preparation.
            </div>
            {guideData.englishGuide.commonMistakes.map((cm, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl glass-panel border border-slate-800 space-y-1.5 text-xs">
                <div className="font-bold text-slate-200 text-xs">{cm.category}</div>
                <div className="text-slate-400 text-[11px]">{cm.rule}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className="p-2 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300">
                    <span className="font-bold text-red-400 mr-1.5">&times;</span>{cm.wrong}
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-300">
                    <span className="font-bold text-emerald-400 mr-1.5">&check;</span>{cm.correct}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Technical Glossary */}
        {activeTabResource === 'glossary' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search AIoT terms (TFLite, MQTT, ROS2)..."
                value={glossaryQuery}
                onChange={(e) => setGlossaryQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              {filteredGlossary.map((g, i) => (
                <div key={i} className="p-3 rounded-xl glass-panel border border-slate-800 text-xs">
                  <div className="font-bold text-cyan-300 font-mono text-sm mb-1">{g.term}</div>
                  <div className="text-slate-300 leading-relaxed">{g.definition}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
