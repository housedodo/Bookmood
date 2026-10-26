import { useEffect } from 'react';
import '../styles/toast.css';

export interface ToastData {
  message: string;
  action?: { label: string; onClick: () => void };
}

/** Pill at the top of the screen; disappears after 3 seconds. */
export default function Toast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div className="toast" role="status">
      <span className="hand">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="btn btn-small btn-secondary"
          onClick={() => {
            toast.action?.onClick();
            onDone();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
