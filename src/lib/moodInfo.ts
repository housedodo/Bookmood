import { updateBook, type Book } from '../data/db';
import { MOODS } from '../data/moods';
import { deriveTags } from '../data/tropes';
import { scoreBook } from './recommend';

const ALL_MOODS = MOODS.map((mood) => mood.id);

/** True when the app can't tell this book's mood: it matches no mood at all. */
export function moodUnknown(book: Book): boolean {
  return scoreBook(book, ALL_MOODS).score === 0;
}

/** The moods this book matches best, strongest first (the reader's own moods first). */
export function bookMoods(book: Book, max = 3): string[] {
  const own = book.moods ?? [];
  const detected = MOODS.filter((m) => !own.includes(m.id))
    .map((m) => ({ id: m.id, score: scoreBook({ ...book, moods: [] }, [m.id]).score }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.id);
  return [...own, ...detected].slice(0, Math.max(max, own.length));
}

/** Automatic tags from everything known about the book (subjects, subtitle, description, blurb). */
export function autoTags(book: Pick<Book, 'subjects' | 'subtitle' | 'description' | 'blurb' | 'hiddenTags'>): string[] {
  return deriveTags([...book.subjects, book.subtitle ?? ''], [book.description ?? '', book.blurb ?? ''].join(' \n '), book.hiddenTags);
}

/** Saves back-cover text and adds any trope tags found in it. */
export async function saveBlurb(book: Book, blurb: string): Promise<void> {
  const updated = { ...book, blurb };
  await updateBook(book.id, { blurb, tags: [...new Set([...book.tags, ...autoTags(updated)])] });
}
