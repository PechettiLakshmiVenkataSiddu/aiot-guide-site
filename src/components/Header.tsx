import React, { useState } from 'react';
import { Volume2, VolumeX, Vibrate, Settings, Radio, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useSensory } from '../context/useSensory';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
  const {
    isMuted,
    volume,
    hapticsEnabled,
    hapticsSupported,
    ambientActive,
    setMuted,
    setVolume,
    setHapticsEnabled,
    toggleAmbient,
    playFeedback
  } = useSensory();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleQuickMute = () => {
    const nextMute = !isMuted;
    setMuted(nextMute);
    if (!nextMute) {
      playFeedback('tap', 'tap');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md md:max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(0,242,254,0.4)]">
              <span className="font-extrabold text-slate-950 text-xs tracking-wider">AIoT</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Master Guide
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-400 font-mono">PWA</span>
              </div>
              <div className="text-[10px] text-slate-400">2025–2033 Roadmap</div>
            </div>
          </div>

          {/* Quick Sensory Controls */}
          <div className="flex items-center gap-1">
            {/* Quick Audio Mute Toggle */}
            <button
              onClick={handleQuickMute}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border transition-all ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
              }`}
              aria-label={isMuted ? 'Unmute synthesized sound' : 'Mute synthesized sound'}
              title={isMuted ? 'Sound is Muted (Click to Unmute)' : 'Sound is Active'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Settings Modal Toggle */}
            <button
              onClick={() => {
                playFeedback('tap', 'tap');
                setSettingsOpen(true);
              }}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              aria-label="Sensory Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm rounded-2xl glass-panel-glow bg-slate-900 p-5 border border-slate-700 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Sensory & App Settings</h3>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  aria-label="Close settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 py-4">
                {/* Sound Synthesis Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Web Audio FX</div>
                    <div className="text-xs text-slate-400">Synthesized clicks, chimes & blips</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isMuted;
                      setMuted(next);
                      if (!next) playFeedback('tap', 'tap');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      !isMuted
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {!isMuted ? 'Enabled' : 'Muted'}
                  </button>
                </div>

                {/* Volume Slider */}
                {!isMuted && (
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* Ambient Hum */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      Ambient Edge Hum
                    </div>
                    <div className="text-xs text-slate-400">Subtle 55Hz grounding frequency</div>
                  </div>
                  <button
                    onClick={toggleAmbient}
                    disabled={isMuted}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      ambientActive && !isMuted
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 opacity-60'
                    }`}
                  >
                    {ambientActive && !isMuted ? 'Active' : 'Off'}
                  </button>
                </div>

                {/* Haptic Vibration */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Vibrate className="w-3.5 h-3.5 text-amber-400" />
                      Tactile Haptics
                    </div>
                    <div className="text-xs text-slate-400">
                      {hapticsSupported ? 'Vibrate on tap, checkmarks, completion' : 'Haptics not supported on this device'}
                    </div>
                  </div>
                  {hapticsSupported ? (
                    <button
                      onClick={() => {
                        const next = !hapticsEnabled;
                        setHapticsEnabled(next);
                        if (next) playFeedback(undefined, 'tap');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        hapticsEnabled
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {hapticsEnabled ? 'On' : 'Off'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-amber-400/80 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/40">
                      Unavailable
                    </span>
                  )}
                </div>

                {/* Test Sensory Button */}
                <button
                  onClick={() => playFeedback('step-done', 'step-done')}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-semibold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Test Sound & Haptic Pulse
                </button>

                {/* Diagnostics Link */}
                <a
                  href="#debug"
                  onClick={() => setSettingsOpen(false)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <span>Open System Diagnostics (/debug)</span>
                </a>
              </div>

              {/* Security & Static Footnote */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% Free & Open Source &bull; Static PWA &bull; No Server</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
