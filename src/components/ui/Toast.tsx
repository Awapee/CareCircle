import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Brief confirmations ("Marked as done"). They sit above the mobile bottom bar, are announced
 * by screen readers through a polite live region, and disappear after a few seconds.
 */

type Tone = 'success' | 'error';

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6"
      >
        {toast && (
          <div className="flex max-w-md items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-raised">
            {toast.tone === 'error' ? (
              <TriangleAlert className="size-4 shrink-0 text-accent-300" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-brand-200" aria-hidden="true" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
