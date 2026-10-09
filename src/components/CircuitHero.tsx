import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Cpu, Wifi, Activity } from 'lucide-react';

export const CircuitHero: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full overflow-hidden rounded-2xl glass-panel border border-cyan-500/20 p-5 shadow-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950">
      {/* Background ambient radial glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Header */}
      <div className="relative z-10 flex flex-col items-center text-center mb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase mb-3 shadow-[0_0_12px_rgba(0,242,254,0.2)]"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Interactive Study Guide &middot; 2025–2033</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2"
        >
          AIoT <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Engineer</span>
        </motion.h1>
        
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          Edge AI &bull; PyTorch &bull; TFLite &bull; MQTT &bull; Raspberry Pi &bull; Autonomous Vehicles
        </p>
      </div>

      {/* Animated Circuit Board SVG */}
      <div className="relative w-full h-44 sm:h-52 my-1">
        <svg
          viewBox="0 0 400 180"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Grid background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#00f2fe" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="400" height="180" fill="url(#grid)" />

          {/* Trace 1: Sensor (left) to Pi 4 (center) */}
          <motion.path
            d="M 60 90 H 130 L 160 90"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.path
            d="M 60 90 H 130 L 160 90"
            stroke="url(#traceGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={shouldReduceMotion ? {} : { pathLength: 0 }}
            animate={shouldReduceMotion ? {} : { pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
          />

          {/* Trace 2: Pi 4 (center) to MQTT Broker / Cloud (right) */}
          <motion.path
            d="M 240 90 H 280 L 310 90 H 340"
            stroke="rgba(0, 242, 254, 0.3)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.path
            d="M 240 90 H 280 L 310 90 H 340"
            stroke="url(#traceGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={shouldReduceMotion ? {} : { pathLength: 0 }}
            animate={shouldReduceMotion ? {} : { pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'loop', delay: 1, ease: 'easeInOut' }}
          />

          {/* Secondary Circuit Traces for aesthetic realism */}
          <path d="M 60 40 H 110 L 140 70" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 60 140 H 120 L 150 110" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 260 70 L 290 40 H 340" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 260 110 L 290 140 H 340" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Flowing Packet from Sensor to Pi */}
          {!shouldReduceMotion && (
            <motion.circle
              r="4.5"
              fill="#10b981"
              filter="url(#glowFilter)"
              animate={{
                cx: [60, 160],
                cy: [90, 90],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}

          {/* Flowing MQTT Packet from Pi to Cloud */}
          {!shouldReduceMotion && (
            <motion.circle
              r="4.5"
              fill="#00f2fe"
              filter="url(#glowFilter)"
              animate={{
                cx: [240, 340],
                cy: [90, 90],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1,
                ease: 'easeInOut'
              }}
            />
          )}

          {/* Node 1: Physical Sensor (DHT22 / ADXL345) */}
          <g transform="translate(60, 90)">
            <circle r="22" fill="#0f172a" stroke="#10b981" strokeWidth="2" filter="url(#glowFilter)" />
            <circle r="4" fill="#10b981" />
          </g>

          {/* Node 2: Central Edge Processor (Raspberry Pi 4 / TFLite) */}
          <g transform="translate(200, 90)">
            <rect x="-35" y="-30" width="70" height="60" rx="10" fill="#0f172a" stroke="#00f2fe" strokeWidth="2.5" filter="url(#glowFilter)" />
            {/* Chip pins */}
            <line x1="-30" y1="-34" x2="-30" y2="-30" stroke="#00f2fe" strokeWidth="2" />
            <line x1="-15" y1="-34" x2="-15" y2="-30" stroke="#00f2fe" strokeWidth="2" />
            <line x1="0" y1="-34" x2="0" y2="-30" stroke="#00f2fe" strokeWidth="2" />
            <line x1="15" y1="-34" x2="15" y2="-30" stroke="#00f2fe" strokeWidth="2" />
            <line x1="30" y1="-34" x2="30" y2="-30" stroke="#00f2fe" strokeWidth="2" />

            <line x1="-30" y1="30" x2="-30" y2="34" stroke="#00f2fe" strokeWidth="2" />
            <line x1="-15" y1="30" x2="-15" y2="34" stroke="#00f2fe" strokeWidth="2" />
            <line x1="0" y1="30" x2="0" y2="34" stroke="#00f2fe" strokeWidth="2" />
            <line x1="15" y1="30" x2="15" y2="34" stroke="#00f2fe" strokeWidth="2" />
            <line x1="30" y1="30" x2="30" y2="34" stroke="#00f2fe" strokeWidth="2" />
          </g>

          {/* Node 3: MQTT Telemetry Broker / Cloud */}
          <g transform="translate(340, 90)">
            <circle r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" filter="url(#glowFilter)" />
            <circle r="4" fill="#38bdf8" />
          </g>
        </svg>

        {/* Labels Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-3 sm:px-6">
          <div className="flex flex-col items-center">
            <span className="p-1 rounded-full bg-emerald-950/80 text-emerald-400 mb-1 border border-emerald-500/30">
              <Activity className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-medium text-emerald-400">Sensors</span>
            <span className="text-[9px] text-slate-400">I2C / SPI</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 mb-1 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,254,0.3)]">
              <Cpu className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-bold text-cyan-300">Raspberry Pi</span>
            <span className="text-[9px] font-mono text-cyan-400/80">TFLite 18ms</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="p-1 rounded-full bg-sky-950/80 text-sky-400 mb-1 border border-sky-500/30">
              <Wifi className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-medium text-sky-400">MQTT</span>
            <span className="text-[9px] text-slate-400">QoS 1 Pub/Sub</span>
          </div>
        </div>
      </div>

      {/* Quick Action Badges */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/80 text-center">
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-lg font-extrabold text-cyan-400">10</div>
          <div className="text-[10px] text-slate-400 font-medium">Hardware AIoT</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-lg font-extrabold text-emerald-400">12</div>
          <div className="text-[10px] text-slate-400 font-medium">Sunday Projects</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-lg font-extrabold text-amber-400">163</div>
          <div className="text-[10px] text-slate-400 font-medium">Study Pages</div>
        </div>
      </div>
    </div>
  );
};
