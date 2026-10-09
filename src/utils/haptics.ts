/**
 * Central Haptics Engine for Android Chrome / Mobile browsers.
 * Complies with navigator.vibrate spec and ensures safety (never vibrates on scroll,
 * only executes after user gestures, respects user preference toggle).
 */

export type HapticPattern = 
  | 'tap'
  | 'step-done'
  | 'project-done'
  | 'error'
  | 'long-press'
  | 'swipe-tick';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  'tap': 10,
  'step-done': [15],
  'project-done': [20, 40, 20, 40, 60],
  'error': [60, 40, 60],
  'long-press': 25,
  'swipe-tick': 8
};

const STORAGE_KEY = 'aiot_haptics_enabled';

class HapticsEngine {
  private enabled: boolean = true;
  private isScrolling: boolean = false;
  private scrollTimeout: number | null = null;
  private hasUserInteracted: boolean = false;

  constructor() {
    // Load persisted preference (default: enabled)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {
      this.enabled = true;
    }

    if (typeof window !== 'undefined') {
      // Listen for scroll to suppress vibration during touch scroll
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
      
      // User gesture flag
      const recordGesture = () => {
        this.hasUserInteracted = true;
        window.removeEventListener('pointerdown', recordGesture);
        window.removeEventListener('keydown', recordGesture);
      };
      window.addEventListener('pointerdown', recordGesture, { passive: true });
      window.addEventListener('keydown', recordGesture, { passive: true });
    }
  }

  private handleScroll = () => {
    this.isScrolling = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = window.setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  };

  private handleTouchMove = () => {
    this.isScrolling = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = window.setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  };

  /**
   * Check if Vibration API is supported on device/browser
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Check if haptics is enabled by user
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Toggle haptics setting
   */
  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Trigger a named haptic pattern
   */
  public trigger(pattern: HapticPattern): boolean {
    if (!this.enabled) return false;
    if (!this.isSupported()) return false;
    if (this.isScrolling) return false; // Never vibrate on scroll
    if (!this.hasUserInteracted) return false; // Needs user gesture

    try {
      const patternValue = HAPTIC_PATTERNS[pattern];
      return navigator.vibrate(patternValue);
    } catch {
      return false;
    }
  }
}

export const haptics = new HapticsEngine();
