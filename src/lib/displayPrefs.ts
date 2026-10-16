import { useCallback, useState } from 'react';

/**
 * Display preferences for this device: larger text and less motion. They're about the screen
 * someone is using, not their account, so they live in this browser rather than the database.
 */

export type TextSize = 'default' | 'large' | 'larger';

export interface DisplayPrefs {
  textSize: TextSize;
  reduceMotion: boolean;
}

const KEY = 'carecircle-display';
const DEFAULTS: DisplayPrefs = { textSize: 'default', reduceMotion: false };

export function readDisplayPrefs(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<DisplayPrefs>;
    return {
      textSize: v.textSize === 'large' || v.textSize === 'larger' ? v.textSize : 'default',
      reduceMotion: v.reduceMotion === true,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Applies the preferences to the page (see `[data-text-size]` and `[data-reduce-motion]` in index.css). */
export function applyDisplayPrefs(prefs: DisplayPrefs = readDisplayPrefs()): void {
  const root = document.documentElement;
  if (prefs.textSize === 'default') delete root.dataset.textSize;
  else root.dataset.textSize = prefs.textSize;
  if (prefs.reduceMotion) root.dataset.reduceMotion = 'true';
  else delete root.dataset.reduceMotion;
}

export function useDisplayPrefs() {
  const [prefs, setPrefs] = useState(readDisplayPrefs);
  const update = useCallback((next: DisplayPrefs) => {
    setPrefs(next);
    applyDisplayPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Still applied for this visit.
    }
  }, []);
  return [prefs, update] as const;
}
