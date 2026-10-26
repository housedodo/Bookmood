interface GenreRule {
  genre: string;
  match: string[];
  /** Subjects containing any of these are not counted for this genre (e.g. "science fiction" is not "Science"). */
  exclude?: string[];
}

// Order matters only for display: genres come out in this order.
const GENRE_RULES: GenreRule[] = [
  { genre: 'Romance', match: ['romance', 'love stories', 'love story', 'romantic', 'romantasy', 'liebesroman', 'liebesgeschichte', 'romanze'] },
  { genre: 'Fantasy', match: ['fantasy', 'romantasy', 'magic', 'dragons', 'fairy tales', 'märchen', 'drachen'] },
  { genre: 'Science Fiction', match: ['science fiction', 'science-fiction', 'sci-fi', 'space opera', 'dystopia', 'dystopie', 'zukunftsroman'] },
  { genre: 'Mystery', match: ['mystery', 'detective', 'whodunit', 'krimi', 'detektiv'] },
  { genre: 'Thriller', match: ['thriller', 'suspense', 'spannungsroman'] },
  { genre: 'Crime', match: ['crime', 'murder', 'kriminalroman', 'mord'] },
  { genre: 'Horror', match: ['horror', 'ghost', 'haunted', 'vampire', 'supernatural', 'grusel', 'gespenst'] },
  { genre: 'Historical Fiction', match: ['historical fiction', 'historical novel', 'historischer roman', 'historische romane'] },
  { genre: 'Literary Fiction', match: ['literary fiction', 'fiction, literary', 'literary novel'] },
  { genre: 'Contemporary', match: ['contemporary'] },
  { genre: 'Humor', match: ['humor', 'humour', 'humorous', 'comedy', 'satire', 'komödie'] },
  { genre: 'Young Adult', match: ['young adult', 'ya fiction', 'teen', 'jugendbuch', 'jugendroman', 'jugendliteratur'] },
  { genre: "Children's", match: ['juvenile', "children's", 'picture book', 'kinderbuch', 'bilderbuch'], exclude: ['young adult'] },
  { genre: 'Graphic Novel', match: ['graphic novel', 'comics', 'manga', 'comic'] },
  { genre: 'Poetry', match: ['poetry', 'poems', 'lyrik', 'gedichte'] },
  { genre: 'Classics', match: ['classics', 'classic literature'] },
  { genre: 'Biography & Memoir', match: ['biography', 'autobiography', 'memoir', 'biografie', 'biographie', 'autobiografie', 'memoiren'] },
  { genre: 'Self-Help', match: ['self-help', 'self help', 'personal growth', 'motivational', 'ratgeber', 'selbsthilfe'] },
  { genre: 'History', match: ['history'], exclude: ['fiction'] },
  { genre: 'Science', match: ['science', 'physics', 'biology', 'chemistry', 'astronomy'], exclude: ['science fiction', 'fiction'] },
  { genre: 'Philosophy', match: ['philosophy', 'philosophie'] },
  { genre: 'Psychology', match: ['psychology', 'psychologie'], exclude: ['fiction', 'roman'] },
  { genre: 'Cooking', match: ['cooking', 'cookbook', 'recipes', 'baking', 'kochbuch', 'rezepte', 'backen'] },
  { genre: 'Travel', match: ['travel', 'reiseführer', 'reiseberichte'], exclude: ['time travel'] },
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
