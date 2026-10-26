import { containsKeyword } from '../lib/text';

// Automatic tags: if any pattern appears in a book's subjects or description, the tag is added.
// Patterns use the same matching as moods (whole words; trailing "*" = word start). English + German.
export const TROPES: { tag: string; patterns: string[] }[] = [
  { tag: 'enemies to lovers', patterns: ['enemies to lovers', 'enemies-to-lovers', 'feinde zu liebenden'] },
  { tag: 'rivals to lovers', patterns: ['rivals to lovers', 'rivals-to-lovers', 'rivalen zu liebenden'] },
  { tag: 'friends to lovers', patterns: ['friends to lovers', 'friends-to-lovers', 'freunde zu liebenden'] },
  { tag: 'fake dating', patterns: ['fake dating', 'fake-dating', 'fake relationship', 'fake boyfriend', 'fake girlfriend', 'fake engagement', 'fake fiancé', 'scheinbeziehung*', 'fake-beziehung'] },
  { tag: 'second chance', patterns: ['second chance*', 'second-chance*', 'zweite chance'] },
  { tag: 'grumpy sunshine', patterns: ['grumpy sunshine', 'grumpy/sunshine', 'grumpy x sunshine', 'grumpy-sunshine'] },
  { tag: 'forced proximity', patterns: ['forced proximity', 'only one bed', 'snowed in', 'eingeschneit'] },
  { tag: 'slow burn', patterns: ['slow burn', 'slow-burn'] },
  { tag: 'forbidden love', patterns: ['forbidden love', 'forbidden romance', 'verbotene liebe'] },
  { tag: 'love triangle', patterns: ['love triangle', 'liebesdreieck*'] },
  { tag: 'small town', patterns: ['small town', 'small-town', 'kleinstadt*'] },
  { tag: 'found family', patterns: ['found family', 'wahlfamilie'] },
  { tag: 'sports', patterns: ['sports romance', 'hockey', 'ice hockey', 'football', 'soccer', 'baseball', 'basketball', 'formula 1', 'eishockey', 'fußball*'] },
  { tag: 'coming of age', patterns: ['coming of age', 'coming-of-age', 'erwachsenwerden'] },
  { tag: 'grief', patterns: ['grief', 'grieving', 'bereavement', 'trauer', 'trauern'] },
  { tag: 'dark academia', patterns: ['dark academia'] },
  { tag: 'romantasy', patterns: ['romantasy'] },
  { tag: 'christmas', patterns: ['christmas', 'weihnacht*'] },
  { tag: 'royalty', patterns: ['royalty', 'royals', 'prince', 'princess', 'prinz', 'prinzessin*', 'königshaus*'] },
  { tag: 'mafia', patterns: ['mafia'] },
  { tag: 'time travel', patterns: ['time travel', 'time-travel', 'zeitreise*'] },
  { tag: 'witches', patterns: ['witch', 'witches', 'hexe', 'hexen*'] },
  { tag: 'vampires', patterns: ['vampire', 'vampires', 'vampir*'] },
];

/** Tags found in the subjects/description, minus ones the reader removed before (hiddenTags). */
export function deriveTags(subjects: string[], description = '', hiddenTags: string[] = []): string[] {
  const text = [...subjects, description].join(' \n ');
  return TROPES.filter(({ tag, patterns }) => !hiddenTags.includes(tag) && patterns.some((p) => containsKeyword(text, p))).map((t) => t.tag);
}
