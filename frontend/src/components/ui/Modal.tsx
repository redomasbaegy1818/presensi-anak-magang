import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdropClick?: boolean;
}

/**
 * Accessible modal built on native <dialog> + showModal(), preserving top-layer
 * focus containment, Esc handling, scroll containment, and focus return.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnBackdropClick = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      if (open) {
        onClose();
      }
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [open, onClose]);

  const isPointerOutside = (clientX: number, clientY: number) => {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: closeOnBackdropClick ? 'any' : 'closerequest' } as Record<
        string,
        string
      >)}
      onPointerDown={(e) => {
        if (!closeOnBackdropClick) return;
        pressedOutsideRef.current = isPointerOutside(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (!closeOnBackdropClick) return;
        if (
          pressedOutsideRef.current &&
          isPointerOutside(e.clientX, e.clientY)
        ) {
          dialogRef.current?.close();
        }
        pressedOutsideRef.current = false;
      }}
    >
      <div className="flex flex-col max-h-[calc(100dvh-2rem)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-3.5">
          <h1
            id={titleId}
            className="text-base font-semibold text-[var(--color-text-primary)]"
          >
            {title}
          </h1>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup dialog"
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 text-sm text-[var(--color-text-primary)]">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
