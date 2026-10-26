import { useEffect, useId, type CSSProperties, type ReactNode } from 'react';
import Icon from './Icon';
import '../styles/sheet.css';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Bottom sheet with a backdrop. Closes on backdrop tap, the X button, or Escape. */
export default function Sheet({ title, onClose, children, className, style }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={['sheet', className].filter(Boolean).join(' ')}
        style={style}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h2 id={titleId} className="sheet-title">{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
