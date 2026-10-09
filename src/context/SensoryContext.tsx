import React, { useState, useCallback } from 'react';
import { sound, type SoundEffect } from '../utils/sound';
import { haptics, type HapticPattern } from '../utils/haptics';
import { SensoryContext } from './SensoryContext.types';

export const SensoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMutedState] = useState(() => sound.getIsMuted());
  const [volume, setVolumeState] = useState(() => sound.getVolume());
  const [hapticsEnabled, setHapticsState] = useState(() => haptics.isEnabled());
  const [hapticsSupported] = useState(() => haptics.isSupported());
  const [ambientActive, setAmbientActive] = useState(() => sound.isAmbientActive());

  const setMuted = useCallback((val: boolean) => {
    sound.setMuted(val);
    setIsMutedState(val);
    setAmbientActive(sound.isAmbientActive());
  }, []);

  const setVolume = useCallback((val: number) => {
    sound.setVolume(val);
    setVolumeState(val);
  }, []);

  const setHapticsEnabled = useCallback((val: boolean) => {
    haptics.setEnabled(val);
    setHapticsState(val);
  }, []);

  const toggleAmbient = useCallback(() => {
    sound.play('hum-toggle');
    setAmbientActive(sound.isAmbientActive());
  }, []);

  const playFeedback = useCallback((soundEffect?: SoundEffect, hapticPattern?: HapticPattern) => {
    if (soundEffect) {
      sound.play(soundEffect);
    }
    if (hapticPattern) {
      haptics.trigger(hapticPattern);
    }
  }, []);

  return (
    <SensoryContext.Provider
      value={{
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
      }}
    >
      {children}
    </SensoryContext.Provider>
  );
};


