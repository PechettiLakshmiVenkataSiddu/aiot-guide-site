import { useContext } from 'react';
import { SensoryContext } from './SensoryContext.types';

export const useSensory = () => {
  const ctx = useContext(SensoryContext);
  if (!ctx) throw new Error('useSensory must be used within a SensoryProvider');
  return ctx;
};
