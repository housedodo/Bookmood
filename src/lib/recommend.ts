import type { Book } from '../data/db';
import { MOODS } from '../data/moods';
import { matchKeyword } from './text';

export interface RecommendOptions {
  maxPages?: number;
  excludeIds?: string[];
  /** Seed for the jitter, so tests (and "Show another") are reproducible. */
  seed?: number;
  /** Size of the random jitter added to each score (default ±0.5). 0 turns it off. */
  jitter?: number;
}

export interface ScoredBook {
  book: Book;
  score: number;
  matched: string[];
  /** Selected moods the reader gave this book themselves. */
  yourMoods: string[];
  reason: string;
}

/** A mood the reader picked for the book outweighs a handful of keyword matches. */
export const YOUR_MOOD_POINTS = 5;

const MAX_RESULTS = 5;

/** Small deterministic random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/**
 * Scores one book: keywords in title/subtitle/subjects/genres/tags count 2, in the description only count 1.
 * Keywords match whole words only ("war" doesn't match "award"); see matchKeyword.
 */
export function scoreBook(book: Book, moodIds: string[]): { score: number; matched: string[]; yourMoods: string[] } {
  const strongText = [book.title, book.subtitle ?? '', ...book.subjects, ...book.genres, ...book.tags].join(' \n ').toLowerCase();
  const descriptionText = (book.description ?? '').toLowerCase();
  let score = 0;
  const matched: string[] = [];

  for (const mood of MOODS.filter((m) => moodIds.includes(m.id))) {
    for (const keyword of mood.keywords) {
      const strong = matchKeyword(strongText, keyword);
      const word = strong ?? matchKeyword(descriptionText, keyword);
      if (!word) continue;
      score += strong ? 2 : 1;
      if (!matched.includes(word)) matched.push(word);
    }
  }
  const yourMoods = (book.moods ?? []).filter((id) => moodIds.includes(id));
  return { score: score + yourMoods.length * YOUR_MOOD_POINTS, matched, yourMoods };
}

function reasonFor(matched: string[], yourMoods: string[]): string {
  const labels = MOODS.filter((m) => yourMoods.includes(m.id)).map((m) => m.label);
  return [labels.length ? `You said: ${labels.join(', ')}` : '', matched.length ? `Matches: ${matched.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');
}

/** Top 5 unread books for the selected moods. Books that match nothing are left out. */
export function recommend(books: Book[], selectedMoodIds: string[], options: RecommendOptions = {}): ScoredBook[] {
  const { maxPages, excludeIds = [], seed, jitter = 0.5 } = options;
  const random = seed === undefined ? Math.random : seededRandom(seed);

  return books
    .filter((book) => book.status === 'unread')
    .filter((book) => !excludeIds.includes(book.id))
    .filter((book) => maxPages === undefined || book.pageCount === undefined || book.pageCount <= maxPages)
    .map((book) => ({ book, ...scoreBook(book, selectedMoodIds) }))
    .filter((scored) => scored.score > 0)
    .map((scored) => ({ ...scored, rank: scored.score + (random() * 2 - 1) * jitter }))
    // Highest score first; on a tie the book that has waited longest wins.
    .sort((a, b) => b.rank - a.rank || a.book.dateAdded - b.book.dateAdded)
    .slice(0, MAX_RESULTS)
    .map(({ book, score, matched, yourMoods }) => ({ book, score, matched, yourMoods, reason: reasonFor(matched, yourMoods) }));
}

/** A random unread book for "Surprise me", or undefined if there are none. */
export function surprise(books: Book[], excludeIds: string[] = [], random: () => number = Math.random): Book | undefined {
  const candidates = books.filter((book) => book.status === 'unread' && !excludeIds.includes(book.id));
  return candidates[Math.floor(random() * candidates.length)];
}
