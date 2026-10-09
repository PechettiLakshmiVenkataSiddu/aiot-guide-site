import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useSensory } from '../context/useSensory';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'python', filename }) => {
  const [copied, setCopied] = useState(false);
  const { playFeedback } = useSensory();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      playFeedback('tap', 'step-done');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-lg">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="font-mono text-slate-400 font-medium text-[11px]">
            {filename || language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        <pre className="table">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-3 text-right text-slate-600 select-none text-[11px]">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
