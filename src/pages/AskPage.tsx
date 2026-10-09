import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSensory } from '../context/useSensory';
import { webLLM } from '../utils/webllm';
import {
  getOrCreateThread,
  loadThreadMessages,
  saveChatMessage,
  recordMessageFeedback,
  type StoredChatMessage
} from '../utils/db';
import {
  MessageSquareQuote,
  Sparkles,
  Play,
  BookOpen,
  Video,
  Bot,
  X,
  Cpu,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Wrench,
  Square,
  RefreshCw
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

export const AskPage: React.FC<AskPageProps> = ({
  initialQuery = '',
  scopedProjectId,
  scopedProjectTitle,
  onClearScope
}) => {
  const { playFeedback } = useSensory();
  const [query, setQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [webGpuSupported, setWebGpuSupported] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [llmProgress, setLlmProgress] = useState<{ text: string; progress: number } | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string>('Initializing RAG worker...');
  
  // Embedded Video Player state
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; timestamp: number } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSubmittedQueryRef = useRef<string>('');
  const handleSearchResultsRef = useRef<(results: SearchResultItem[], searchQ?: string, isAbstaining?: boolean, suggestedProjects?: { id: string; title: string }[]) => void>(() => {});

  // Load persistent thread on mount or when scopedProjectId changes
  useEffect(() => {
    let active = true;
    getOrCreateThread(scopedProjectId || null).then(thread => {
      if (active) {
        setThreadId(thread.id);
        loadThreadMessages(thread.id).then(stored => {
          if (active && stored.length > 0) {
            setMessages(stored);
          }
        });
      }
    });
    return () => { active = false; };
  }, [scopedProjectId]);

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

      const assistantMsg: StoredChatMessage = {
        id: `msg-${Date.now()}`,
        threadId: threadId || 'default',
        role: 'assistant',
        content: `Not found in the guide or videos.${suggestionsText}`,
        results: [],
        isDeepAnswer: false,
        createdAt: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
      saveChatMessage(assistantMsg);
      return;
    }

    if (deepMode && webGpuSupported && results.length > 0) {
      setLlmLoading(true);
      setIsGenerating(true);
      playFeedback('step-done', 'tap');

      try {
        await webLLM.initEngine((prog) => {
          setLlmProgress(prog);
        });
        setLlmLoading(false);

        const passages = results.map(r => ({
          title: r.chunk.title,
          text: r.chunk.parentText || r.chunk.text
        }));
        const assistantMsgId = `msg-${Date.now()}`;

        const initialMsg: StoredChatMessage = {
          id: assistantMsgId,
          threadId: threadId || 'default',
          role: 'assistant',
          content: '',
          results,
          isDeepAnswer: true,
          createdAt: Date.now()
        };

        setMessages(prev => [...prev, initialMsg]);

        let accumulatedAnswer = '';
        await webLLM.generateAnswer(activeQ, passages, 'concise', (token) => {
          accumulatedAnswer += token;
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: m.content + token } : m))
          );
        });

        setIsGenerating(false);
        saveChatMessage({ ...initialMsg, content: accumulatedAnswer });
        playFeedback('project-done', 'step-done');
      } catch (err: any) {
        setLlmLoading(false);
        setIsGenerating(false);
        const fallbackMsg: StoredChatMessage = {
          id: `msg-${Date.now()}`,
          threadId: threadId || 'default',
          role: 'assistant',
          content: `Deep answer notice: ${err.message}. Showing retrieved passages from the guide below:`,
          results,
          isDeepAnswer: false,
          createdAt: Date.now()
        };
        setMessages(prev => [...prev, fallbackMsg]);
        saveChatMessage(fallbackMsg);
      }
    } else {
      playFeedback('step-done', 'step-done');
      const textSummary = results.length > 0
        ? `I found ${results.length} relevant reference passages in the master guide and video transcripts:`
        : "Not found in the guide or videos.";

      const assistantMsg: StoredChatMessage = {
        id: `msg-${Date.now()}`,
        threadId: threadId || 'default',
        role: 'assistant',
        content: textSummary,
        results,
        isDeepAnswer: false,
        createdAt: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
      saveChatMessage(assistantMsg);
    }
  }, [deepMode, webGpuSupported, playFeedback, query, threadId]);

  // Keep ref up to date with latest handleSearchResults
  useEffect(() => {
    handleSearchResultsRef.current = handleSearchResults;
  });

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || isSearching) return;
    playFeedback('tap', 'tap');
    lastSubmittedQueryRef.current = searchQuery;

    const userMsg: StoredChatMessage = {
      id: `user-${Date.now()}`,
      threadId: threadId || 'default',
      role: 'user',
      content: searchQuery,
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    saveChatMessage(userMsg);
    setIsSearching(true);

    workerRef.current?.postMessage({
      action: 'SEARCH',
      query: searchQuery,
      projectId: scopedProjectId || null,
      topK: 4
    });

    setQuery('');
  }, [isSearching, playFeedback, scopedProjectId, threadId]);

  // Handle assistant action buttons
  const triggerAction = (type: 'quiz' | 'troubleshoot') => {
    if (!scopedProjectId && !scopedProjectTitle) {
      handleSearch(type === 'quiz' ? 'Quiz me on AIoT architecture and protocols' : 'Troubleshoot my I2C and GPIO wiring');
      return;
    }

    if (type === 'quiz') {
      handleSearch(`Quiz me on ${scopedProjectTitle}: test my understanding of its sensors, wiring, and code.`);
    } else {
      handleSearch(`Troubleshoot my wiring for ${scopedProjectTitle}: what are common connection errors, wrong pins, or resistor mistakes?`);
    }
  };

  // Stop active generation
  const handleStopGeneration = () => {
    webLLM.stopGeneration();
    setIsGenerating(false);
    setLlmLoading(false);
    playFeedback('tap', 'tap');
  };

  // Feedback up/down
  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    playFeedback('tap', 'tap');
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
    recordMessageFeedback(msgId, type);
  };

  // Initialize Web Worker safely on mount
  useEffect(() => {
    webLLM.checkWebGPUSupport().then(setWebGpuSupported);

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
        setIsGenerating(false);
        playFeedback('error', 'error');
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            threadId: 'default',
            role: 'assistant',
            content: `Error: ${message}`,
            createdAt: Date.now()
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
  }, [messages, isSearching, llmLoading, isGenerating]);

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

          {/* Deep Answer Toggle with WebGPU Feature Detection */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playFeedback('tap', 'tap');
                if (!webGpuSupported) {
                  return;
                }
                setDeepMode(!deepMode);
              }}
              disabled={!webGpuSupported}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                !webGpuSupported
                  ? 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                  : deepMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={webGpuSupported ? 'Toggle in-browser WebLLM' : 'WebGPU not detected on this device'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{webGpuSupported ? 'Deep LLM (WebGPU)' : 'WebGPU Unavailable'}</span>
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
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${workerStatus === 'Ready' ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
              <span>{workerStatus === 'Ready' ? 'RRF Hybrid Search over 163 pages & 41 videos' : workerStatus}</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  playFeedback('tap', 'tap');
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}

        {/* Quick Assistant Action Cards */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
          <button
            onClick={() => triggerAction('quiz')}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3 h-3 text-cyan-400" />
            <span>Quiz Me</span>
          </button>
          <button
            onClick={() => triggerAction('troubleshoot')}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Wrench className="w-3 h-3 text-amber-400" />
            <span>Troubleshoot Wiring</span>
          </button>
        </div>
      </div>

      {/* Embedded Video Modal/Overlay if a timestamp is selected */}
      {activeVideo && (
        <div className="p-3.5 rounded-2xl glass-panel-glow border border-cyan-500/40 bg-slate-900 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Playing at {Math.floor(activeVideo.timestamp / 60)}:{(activeVideo.timestamp % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://youtu.be/${activeVideo.videoId}?t=${activeVideo.timestamp}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-rose-300 underline"
              >
                Open in YouTube App
              </a>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden aspect-video bg-black border border-slate-800">
            <iframe
              key={`${activeVideo.videoId}-${activeVideo.timestamp}`}
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
                Instant hybrid RRF search over all 12 chapters, hardware project schematics, Python code samples, and video timestamps.
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
                <div className="flex items-center justify-between mb-1.5 text-cyan-400 font-semibold text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{m.isDeepAnswer ? 'Deep Answer (WebLLM)' : 'Retrieved Knowledge'}</span>
                  </div>

                  {/* Feedback Up/Down Buttons */}
                  <div className="flex items-center gap-1 text-slate-500">
                    <button
                      onClick={() => handleFeedback(m.id, 'up')}
                      className={`p-1 rounded hover:text-cyan-400 ${m.feedback === 'up' ? 'text-cyan-400' : ''}`}
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(m.id, 'down')}
                      className={`p-1 rounded hover:text-rose-400 ${m.feedback === 'down' ? 'text-rose-400' : ''}`}
                      aria-label="Unhelpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
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
                            <span className="w-4 h-4 rounded bg-cyan-950 text-cyan-400 text-[10px] flex items-center justify-center font-mono shrink-0">
                              [{i + 1}]
                            </span>
                            {isVideo ? (
                              <Video className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[180px]">{chunk.title}</span>
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

                        {/* Passage snippet (Full parent text when available) */}
                        <p className="text-[11px] text-slate-300 line-clamp-4 leading-relaxed font-sans whitespace-pre-line">
                          {chunk.parentText || chunk.text}
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
              <span>Searching knowledge index...</span>
            </div>
            <div className="space-y-1.5">
              <div className="w-3/4 h-2.5 bg-slate-800 rounded animate-pulse" />
              <div className="w-full h-2.5 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        )}

        {/* WebLLM downloading indicator & streaming controls */}
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
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400">{llmProgress?.text || 'Loading weights into WebGPU...'}</p>
              <button
                onClick={handleStopGeneration}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Square className="w-2.5 h-2.5 fill-rose-400" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Active streaming stop button */}
        {isGenerating && !llmLoading && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleStopGeneration}
              className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-900 transition-colors shadow-lg"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              <span>Stop Generating</span>
            </button>
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
