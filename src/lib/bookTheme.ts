import type { CSSProperties } from 'react';

/** Inline style that tints an element with a book's pastel theme (see .book-theme in theme.css). */
export function bookThemeStyle(hue: number): CSSProperties {
  return { '--hue': String(hue) } as CSSProperties;
}
