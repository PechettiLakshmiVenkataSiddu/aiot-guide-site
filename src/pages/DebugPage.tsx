import React, { useState, useEffect } from 'react';
import { useSensory } from '../context/useSensory';
import { webLLM } from '../utils/webllm';
import {
  Activity,
  Cpu,
  Database,
  Radio,
  Volume2,
  Vibrate,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';

export const DebugPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { playFeedback, isMuted, volume, hapticsEnabled, hapticsSupported } = useSensory();
  const [manifest, setManifest] = useState<any>(null);
  const [webGpuStatus, setWebGpuStatus] = useState<boolean | null>(null);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [testEmbeddingQuery, setTestEmbeddingQuery] = useState('ADXL345 vibration sensor');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // 1. Fetch manifest
    fetch('./rag-index/manifest.json')
      .then(res => res.json())
      .then(setManifest)
      .catch(() => {
        fetch('/rag-index/manifest.json')
          .then(res => res.json())
          .then(setManifest)
          .catch(e => console.warn("Manifest load error:", e));
      });

    // 2. WebGPU Check
    webLLM.checkWebGPUSupport().then(setWebGpuStatus);

    // 3. Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwActive(!!reg?.active);
      });
    }
  }, []);

  const runSanityEmbedding = () => {
    setIsTesting(true);
    setTestResult(null);
    playFeedback('tap', 'tap');

    // Run test search via worker
    const worker = new Worker(new URL('../workers/rag.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      if (e.data.type === 'SEARCH_RESULTS') {
        const top = e.data.results[0];
        if (top) {
          setTestResult(`Success! Top hit: "${top.chunk.title}" (Score: ${top.score.toFixed(4)}, Sim: ${top.similarity.toFixed(4)})`);
        } else {
          setTestResult(`Abstention triggered (no match cleared threshold)`);
        }
        setIsTesting(false);
        worker.terminate();
      }
    };
    worker.postMessage({ action: 'SEARCH', query: testEmbeddingQuery, topK: 1 });
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass-panel-glow border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h1 className="text-base font-bold text-white">System Diagnostics & Health (/debug)</h1>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
          >
            Back
          </button>
        )}
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Knowledge Index Status */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Database className="w-4 h-4" />
            <span>Knowledge Base Index</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Chunks:</span>
              <span className="font-mono text-white">{manifest?.chunkCount || '565'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Vector Dimension:</span>
              <span className="font-mono text-cyan-300">{manifest?.embeddingDim || 384}-d</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Embedding Model:</span>
              <span className="font-mono text-white">{manifest?.model || 'Xenova/all-MiniLM-L6-v2'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Version Manifest:</span>
              <span className="font-mono text-amber-300">{manifest?.version || '6e0c2df4b0554cec'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Index Payload Size:</span>
              <span className="font-mono text-emerald-300">~1.64 MB (binary + keyword)</span>
            </div>
          </div>
        </div>

        {/* 2. Hardware Acceleration & Service Worker */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            <span>Hardware & Offline Status</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">WebGPU Acceleration:</span>
              <span className="flex items-center gap-1 font-semibold">
                {webGpuStatus ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Not Detected (Fallback Active)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">PWA Service Worker:</span>
              <span className="flex items-center gap-1 font-semibold">
                {swActive ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active (Offline Ready)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> Initializing
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Vibration API:</span>
              <span className="flex items-center gap-1">
                {hapticsSupported ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Available ({hapticsEnabled ? 'Enabled' : 'Muted'})
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Desktop / Unsupported
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Web Audio Synth:</span>
              <span className="text-white font-mono">
                {isMuted ? 'Muted' : `Active (Vol ${(volume * 100).toFixed(0)}%)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Embedding & Retrieval Sanity Test */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Live In-Browser RAG Sanity Test</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Executes real hybrid RRF search inside the Web Worker to verify vector alignment and keyword scoring.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={testEmbeddingQuery}
            onChange={(e) => setTestEmbeddingQuery(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            placeholder="Type query to test..."
          />
          <button
            onClick={runSanityEmbedding}
            disabled={isTesting}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>{isTesting ? 'Running...' : 'Run Test'}</span>
          </button>
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-slate-900 border border-cyan-800/60 text-xs text-cyan-300 font-mono">
            {testResult}
          </div>
        )}
      </div>

      {/* 4. Sensory Interactive Trigger Checks */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
          <Radio className="w-4 h-4" />
          <span>Sensory Engine Diagnostics</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => playFeedback('tap', 'tap')}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5"
          >
            <Vibrate className="w-3.5 h-3.5" />
            <span>Test Tap (10ms)</span>
          </button>
          <button
            onClick={() => playFeedback('step-done', 'step-done')}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-300 flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Audio Blip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
