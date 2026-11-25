import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
  /** impede fechar (ex.: durante envio) */
  locked?: boolean;
  wide?: boolean;
}

/** Modal acessível baseado em <dialog> nativo (foco preso, Esc, backdrop). */
export function Dialog({ open, onClose, title, hideTitle, children, locked, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      lastFocus.current = document.activeElement;
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    if (!open) {
      document.documentElement.style.overflow = '';
      (lastFocus.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);

  useEffect(() => () => { document.documentElement.style.overflow = ''; }, []);

  return (
    <dialog
      ref={ref}
      className="mk-dialog"
      style={wide ? { maxWidth: 'min(56rem, calc(100vw - 1.5rem))' } : undefined}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!locked) onClose(); }}
      onClick={(e) => { if (e.target === ref.current && !locked) onClose(); }}
    >
      {open && (
        <div className="dialog-panel card-surface relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain p-5 sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-xl font-semibold text-burgundy sm:text-2xl'}>{title}</h2>
            <button type="button" onClick={onClose} disabled={locked} aria-label="Fechar" className="-mr-2 -mt-2 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-cream-200 disabled:opacity-40">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
