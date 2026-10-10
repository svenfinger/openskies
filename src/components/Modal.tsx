import {
  useEffect,
  useRef,
  type ComponentProps,
  type PointerEvent,
  type MouseEvent,
} from 'react';

interface ModalProps extends Omit<
  ComponentProps<'dialog'>,
  'open' | 'onCancel'
> {
  open: boolean;
  onDismiss: () => void;
}

/** Native photo dialog with focus restoration and deliberate backdrop dismissal. */
export default function Modal({
  open,
  onDismiss,
  children,
  className = '',
  ...props
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function isBackdrop(
    event: PointerEvent<HTMLDialogElement> | MouseEvent<HTMLDialogElement>,
  ) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  return (
    <dialog
      {...props}
      ref={dialogRef}
      className={`site-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => {
        backdropPointerDown.current = isBackdrop(event);
      }}
      onClick={(event) => {
        if (backdropPointerDown.current && isBackdrop(event)) onDismiss();
        backdropPointerDown.current = false;
      }}
    >
      {children}
    </dialog>
  );
}
