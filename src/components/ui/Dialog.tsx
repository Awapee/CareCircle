import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A modal dialog built on Radix (focus trap, Escape to close, focus returns to the trigger).
 * On phones it fills the width and sits at the bottom, where thumbs reach.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Action buttons, kept visible below the scrolling body. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  // These dialogs are opened from state rather than a Radix trigger, so remember what had focus
  // when the dialog opened (usually the button that opened it) and return focus there on close.
  const returnFocusTo = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      returnFocusTo.current = document.activeElement;
    }
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-canvas shadow-raised outline-none',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
            size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
          onCloseAutoFocus={(event) => {
            const target = returnFocusTo.current;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
            returnFocusTo.current = null;
          }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-0.5 text-sm text-ink-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
