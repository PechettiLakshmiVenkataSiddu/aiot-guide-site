import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSensory } from '../context/useSensory';
import { webLLM } from '../utils/webllm';
import {
  MessageSquareQuote,
  Sparkles,
  Play,
  BookOpen,
  Video,
  Bot,
  X,
  Cpu,
  Loader2
} from 'lucide-react';

interface AskPageProps {
  initialQuery?: string;
  scopedProjectId?: string | null;
  scopedProjectTitle?: string | null;
  onClearScope?: () => void;
}

interface SearchResultItem {
  chunk: {
    id: string;
    source: string;
    type: 'pdf' | 'video';
    title: string;
    chapter: string;
    projectId: string | null;
    page?: number;
    videoId?: string;
    timestamp?: number;
    timeFormatted?: string;
    text: string;
    parentText?: string;
    section?: string;
  };
  score: number;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: SearchResultItem[];
  isDeepAnswer?: boolean;
}

export const AskPage: React.FC<AskPageProps> = ({
  initialQuery = '',
  scopedProjectId,
  scopedProjectTitle,
  onClearScope
}) => {
  const { playFeedback } = useSensory();
  const [query, setQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [webGpuSupported, setWebGpuSupported] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmProgress, setLlmProgress] = useState<{ text: string; progress: number } | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string>('Initializing RAG worker...');
  
  // Embedded Video Player state
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; timestamp: number } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested Prompts
  const suggestions = scopedProjectId
    ? [
        `What are the hardware requirements for ${scopedProjectTitle}?`,
        `Explain the wiring and connections for ${scopedProjectTitle}`,
        `Show me the core code explanation for ${scopedProjectTitle}`
      ]
    : [
        'How do I connect the ADXL345 vibration sensor to Raspberry Pi?',
        'What is INT8 quantization and why use it for Edge AI?',
        'Explain MQTT topic design for factory floor monitoring',
        'How do I configure .cursorrules for Raspberry Pi?',
        'What are the rules for Japanese business email etiquette?'
      ];

  const lastSubmittedQueryRef = useRef<string>('');
  const handleSearchResultsRef = useRef<(results: SearchResultItem[], searchQ?: string, isAbstaining?: boolean, suggestedProjects?: { id: string; title: string }[]) => void>(() => {});

  const handleSearchResults = useCallback(async (
    results: SearchResultItem[],
    searchQ?: string,
    isAbstaining?: boolean,
    suggestedProjects?: { id: string; title: string }[]
  ) => {
    setIsSearching(false);
    const activeQ = searchQ || lastSubmittedQueryRef.current || query;

    if (isAbstaining || results.length === 0) {
      playFeedback('step-done', 'tap');
      const suggestionsText = suggestedProjects && suggestedProjects.length > 0
        ? `\n\n💡 You might want to explore these related guide projects:\n` +
          suggestedProjects.map(p => `• ${p.title}`).join('\n')
        : '';

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Not found in the guide or videos.${suggestionsText}`,
          results: [],
          isDeepAnswer: false
        }
      ]);
      return;
    }

    if (deepMode && webGpuSupported && results.length > 0) {
      setLlmLoading(true);
      playFeedback('step-done', 'tap');

      try {
        await webLLM.initEngine((prog) => {
          setLlmProgress(prog);
        });
        setLlmLoading(false);

        const passages = results.map(r => `${r.chunk.title}: ${r.chunk.parentText || r.chunk.text}`);
        const assistantMsgId = `msg-${Date.now()}`;

        setMessages(prev => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            results,
            isDeepAnswer: true
          }
        ]);

        await webLLM.generateAnswer(activeQ, passages, (token) => {
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: m.content + token } : m))
          );
        });

        playFeedback('project-done', 'step-done');
      } catch (err: any) {
        setLlmLoading(false);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `Deep answer fallback: ${err.message}. Showing retrieved passages below:`,
            results,
            isDeepAnswer: false
          }
        ]);
      }
    } else {
      playFeedback('step-done', 'step-done');
      const textSummary = results.length > 0
        ? `I found ${results.length} relevant reference passages in the master guide and video transcripts:`
        : "Not found in the guide or videos.";

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: textSummary,
          results,
          isDeepAnswer: false
        }
      ]);
    }
  }, [deepMode, webGpuSupported, playFeedback, query]);

  // Keep ref up to date with latest handleSearchResults
  useEffect(() => {
    handleSearchResultsRef.current = handleSearchResults;
  });

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || isSearching) return;
    playFeedback('tap', 'tap');
    lastSubmittedQueryRef.current = searchQuery;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: searchQuery
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSearching(true);

    workerRef.current?.postMessage({
      action: 'SEARCH',
      query: searchQuery,
      projectId: scopedProjectId || null,
      topK: 4
    });

    setQuery('');
  }, [isSearching, playFeedback, scopedProjectId]);

  // Initialize Web Worker and check WebGPU safely once on mount
  useEffect(() => {
    webLLM.checkWebGPUSupport().then(setWebGpuSupported);

    // Instantiate RAG Worker
    const worker = new Worker(new URL('../workers/rag.worker.ts', import.meta.url), {
      type: 'module'
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, results, message, query: resQuery, isAbstaining, suggestedProjects } = e.data;
      if (type === 'STATUS') {
        setWorkerStatus(message);
      } else if (type === 'READY') {
        setWorkerStatus('Ready');
      } else if (type === 'SEARCH_RESULTS') {
        handleSearchResultsRef.current(results, resQuery, isAbstaining, suggestedProjects);
      } else if (type === 'ERROR') {
        setIsSearching(false);
        setLlmLoading(false);
        playFeedback('error', 'error');
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${message}`
          }
        ]);
      }
    };

    worker.postMessage({ action: 'INIT', base: import.meta.env.BASE_URL });

    return () => {
      worker.terminate();
    };
  }, [playFeedback]);

  // Handle Initial Query if supplied from another page
  const hasExecutedInitial = useRef(false);
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0 && !hasExecutedInitial.current) {
      hasExecutedInitial.current = true;
      const timer = setTimeout(() => {
        handleSearch(initialQuery);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, handleSearch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching, llmLoading]);

  const seekVideo = (videoId: string, seconds: number) => {
    playFeedback('tap', 'tap');
    setActiveVideo({ videoId, timestamp: seconds });
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Header & Scope Indicator */}
      <div className="p-4 rounded-2xl glass-panel-glow border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h1 className="text-base font-bold text-white">Browser RAG Assistant</h1>
          </div>

          {/* Deep Answer Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playFeedback('tap', 'tap');
                setDeepMode(!deepMode);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                deepMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title={webGpuSupported ? 'WebGPU Available' : 'WebGPU not detected'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Deep LLM (WebGPU)</span>
            </button>
          </div>
        </div>

        {/* Project Scope Banner */}
        {scopedProjectId ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-300 truncate">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">Scoped to:</span>
              <span className="truncate text-slate-200">{scopedProjectTitle}</span>
            </div>
            {onClearScope && (
              <button
                onClick={onClearScope}
                className="text-slate-400 hover:text-white p-1 rounded-lg ml-2 shrink-0"
                aria-label="Remove scope"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${workerStatus === 'Ready' ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
            <span>{workerStatus === 'Ready' ? 'Searching 163 pages + 41 video transcripts client-side in Web Worker' : workerStatus}</span>
          </div>
        )}
      </div>

      {/* Embedded Video Modal/Overlay if a timestamp is selected */}
      {activeVideo && (
        <div className="p-3.5 rounded-2xl glass-panel-glow border border-cyan-500/40 bg-slate-900 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Playing at {Math.floor(activeVideo.timestamp / 60)}:{(activeVideo.timestamp % 60).toString().padStart(2, '0')}</span>
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden aspect-video bg-black border border-slate-800">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo.videoId}?start=${activeVideo.timestamp}&autoplay=1`}
              title="YouTube Player"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* 2. Messages List */}
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <MessageSquareQuote className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ask the AIoT Knowledge Base</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Instant hybrid search over all 12 chapters, hardware project schematics, Python code samples, and video timestamps.
              </p>
            </div>

            <div className="space-y-2 text-left pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Suggested Questions:
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(s)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs text-slate-300 transition-colors"
                  >
                    &ldquo;{s}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-sm'
                  : 'glass-panel border border-slate-800 text-slate-200 rounded-bl-sm'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5 text-cyan-400 font-semibold text-[11px]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{m.isDeepAnswer ? 'Deep Answer (WebLLM)' : 'Retrieved Knowledge'}</span>
                </div>
              )}

              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Citations & Best Passages */}
              {m.results && m.results.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                    Citations & Referenced Sources:
                  </span>
                  {m.results.map((res, i) => {
                    const chunk = res.chunk;
                    const isVideo = chunk.type === 'video';

                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs space-y-2 hover:border-cyan-500/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100 flex items-center gap-1.5 text-[11px]">
                            {isVideo ? (
                              <Video className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{chunk.title}</span>
                          </span>

                          {/* Action Button: Page link or Seek Video */}
                          {isVideo && chunk.videoId && chunk.timestamp !== undefined ? (
                            <button
                              onClick={() => seekVideo(chunk.videoId!, chunk.timestamp!)}
                              className="px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-[10px] flex items-center gap-1 hover:bg-rose-900 transition-colors shrink-0"
                            >
                              <Play className="w-2.5 h-2.5 fill-rose-400" />
                              <span>Play at {chunk.timeFormatted}</span>
                            </button>
                          ) : chunk.page ? (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] shrink-0">
                              Page {chunk.page}
                            </span>
                          ) : null}
                        </div>

                        {/* Passage snippet */}
                        <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                          {chunk.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Loading skeleton */}
        {isSearching && (
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 max-w-sm">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Embedding query & searching index...</span>
            </div>
            <div className="space-y-1.5">
              <div className="w-3/4 h-2.5 bg-slate-800 rounded animate-pulse" />
              <div className="w-full h-2.5 bg-slate-800 rounded animate-pulse" />
              <div className="w-1/2 h-2.5 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        )}

        {/* WebLLM downloading indicator */}
        {llmLoading && (
          <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 space-y-2.5 max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                Preparing In-Browser WebLLM...
              </span>
              <span className="font-mono text-purple-400">{llmProgress?.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${llmProgress?.progress || 10}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">{llmProgress?.text || 'Loading weights into WebGPU...'}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Query Input Field (Fixed above bottom nav) */}
      <div className="sticky bottom-16 left-0 right-0 pt-2 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex items-center gap-2 glass-panel-glow bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl"
        >
          <input
            type="text"
            placeholder={scopedProjectId ? `Ask about ${scopedProjectTitle}...` : "Ask any AIoT question..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSearching || llmLoading}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || isSearching || llmLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-bold disabled:opacity-40 active:scale-95 transition-all shadow-md flex items-center gap-1"
          >
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
