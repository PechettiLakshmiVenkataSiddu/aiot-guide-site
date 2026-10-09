import { createContext } from 'react';
import type { SoundEffect } from '../utils/sound';
import type { HapticPattern } from '../utils/haptics';

export interface SensoryContextType {
  isMuted: boolean;
  volume: number;
  hapticsEnabled: boolean;
  hapticsSupported: boolean;
  ambientActive: boolean;
  setMuted: (val: boolean) => void;
  setVolume: (val: number) => void;
  setHapticsEnabled: (val: boolean) => void;
  toggleAmbient: () => void;
  playFeedback: (soundEffect?: SoundEffect, hapticPattern?: HapticPattern) => void;
}

export const SensoryContext = createContext<SensoryContextType | null>(null);
