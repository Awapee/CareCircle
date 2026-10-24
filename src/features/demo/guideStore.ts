import { useSyncExternalStore } from 'react';

/** Where the visitor is in the guided walkthrough. Remembered in this browser only. */
export interface GuideState {
  step: number;
  open: boolean;
}

const KEY = 'carecircle-demo-guide';
const listeners = new Set<() => void>();

function read(): GuideState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<GuideState>;
      if (typeof v.step === 'number' && typeof v.open === 'boolean') return { step: v.step, open: v.open };
    }
  } catch {
    // Storage blocked or corrupt: start from the beginning.
  }
  return { step: 0, open: true };
}

let state: GuideState = read();

export const guideStore = {
  get: (): GuideState => state,
  set(patch: Partial<GuideState>) {
    state = { ...state, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Remembering the step is a convenience only.
    }
    for (const l of listeners) l();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useGuide(): GuideState {
  return useSyncExternalStore(guideStore.subscribe, guideStore.get, guideStore.get);
}
