interface GenreRule {
  genre: string;
  match: string[];
  /** Subjects containing any of these are not counted for this genre (e.g. "science fiction" is not "Science"). */
  exclude?: string[];
}

// Order matters only for display: genres come out in this order.
const GENRE_RULES: GenreRule[] = [
  { genre: 'Romance', match: ['romance', 'love stories', 'love story', 'romantic'] },
  { genre: 'Fantasy', match: ['fantasy', 'magic', 'dragons', 'fairy tales'] },
  { genre: 'Science Fiction', match: ['science fiction', 'sci-fi', 'space opera', 'dystopia'] },
  { genre: 'Mystery', match: ['mystery', 'detective', 'whodunit'] },
  { genre: 'Thriller', match: ['thriller', 'suspense'] },
  { genre: 'Crime', match: ['crime', 'murder'] },
  { genre: 'Horror', match: ['horror', 'ghost', 'haunted', 'vampire', 'supernatural'] },
  { genre: 'Historical Fiction', match: ['historical fiction', 'historical novel'] },
  { genre: 'Literary Fiction', match: ['literary fiction', 'fiction, literary', 'literary novel'] },
  { genre: 'Contemporary', match: ['contemporary'] },
  { genre: 'Humor', match: ['humor', 'humour', 'humorous', 'comedy', 'satire'] },
  { genre: 'Young Adult', match: ['young adult', 'ya fiction', 'teen'] },
  { genre: "Children's", match: ['juvenile', "children's", 'picture book'], exclude: ['young adult'] },
  { genre: 'Graphic Novel', match: ['graphic novel', 'comics', 'manga'] },
  { genre: 'Poetry', match: ['poetry', 'poems'] },
  { genre: 'Classics', match: ['classics', 'classic literature'] },
  { genre: 'Biography & Memoir', match: ['biography', 'autobiography', 'memoir'] },
  { genre: 'Self-Help', match: ['self-help', 'self help', 'personal growth', 'motivational'] },
  { genre: 'History', match: ['history'], exclude: ['fiction'] },
  { genre: 'Science', match: ['science', 'physics', 'biology', 'chemistry', 'astronomy'], exclude: ['science fiction', 'fiction'] },
  { genre: 'Philosophy', match: ['philosophy'] },
  { genre: 'Psychology', match: ['psychology'], exclude: ['fiction'] },
  { genre: 'Cooking', match: ['cooking', 'cookbook', 'recipes', 'baking'] },
  { genre: 'Travel', match: ['travel'], exclude: ['time travel'] },
];

function ruleMatches(rule: GenreRule, subject: string): boolean {
  if (rule.exclude?.some((word) => subject.includes(word))) return false;
  return rule.match.some((word) => subject.includes(word));
}

/** Turns messy API subjects ("Love stories", "FICTION / Romance / Contemporary") into clean genre names. */
export function normalizeGenres(subjects: string[]): string[] {
  const lower = subjects.map((subject) => subject.toLowerCase());
  return GENRE_RULES.filter((rule) => lower.some((subject) => ruleMatches(rule, subject))).map(
    (rule) => rule.genre,
  );
}
