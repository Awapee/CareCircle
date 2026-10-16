import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * A slide-in panel built on Radix Dialog, which provides focus trapping,
 * Escape-to-close, scroll locking and correct ARIA semantics.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: 'left' | 'right';
  /** The button that opens the sheet. Rendering it here lets Radix return focus to it on close. */
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className={
            'fixed inset-y-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-canvas shadow-raised outline-none ' +
            (side === 'right' ? 'right-0 border-l border-line' : 'left-0 border-r border-line')
          }
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-ink"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
