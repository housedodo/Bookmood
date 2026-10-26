import { useEffect, useRef } from 'react';
import type { Book } from '../data/db';

/** Shows the stored cover Blob, or a tinted placeholder with the title. */
export default function BookCover({ book, className }: { book: Book; className?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const hasCover = Boolean(book.coverBlob) && typeof URL.createObjectURL === 'function';

  // Object URLs must be revoked, so the src is managed here rather than in render.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !book.coverBlob) return;
    const objectUrl = URL.createObjectURL(book.coverBlob);
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [book.coverBlob]);

  const classes = ['cover', className].filter(Boolean).join(' ');
  if (hasCover) return <img ref={imgRef} className={classes} alt={`Cover of ${book.title}`} />;
  return (
    <div className={`${classes} cover-placeholder`} aria-hidden="true">
      <span>{book.title}</span>
    </div>
  );
}
