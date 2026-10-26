const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cache = new Map<string, RegExp>();

function patternFor(keyword: string): RegExp {
  let pattern = cache.get(keyword);
  if (!pattern) {
    const prefix = keyword.endsWith('*');
    const word = escapeRegExp(prefix ? keyword.slice(0, -1) : keyword);
    // A prefix keyword swallows the rest of the word, so callers see the real word ("liebesroman").
    pattern = new RegExp(`(?<!\\p{L})${word}${prefix ? '\\p{L}*' : '(?!\\p{L})'}`, 'iu');
    cache.set(keyword, pattern);
  }
  return pattern;
}

/**
 * Whole-word keyword match, case-insensitive, umlaut-aware. Returns the matched word (lowercase) or undefined.
 * A trailing "*" matches the start of a word, for German compounds:
 * "liebes*" matches "Liebesroman" and "Liebesgeschichte", "krimi*" matches "Krimis".
 */
export function matchKeyword(text: string, keyword: string): string | undefined {
  return patternFor(keyword).exec(text)?.[0].toLowerCase();
}

export function containsKeyword(text: string, keyword: string): boolean {
  return patternFor(keyword).test(text);
}
