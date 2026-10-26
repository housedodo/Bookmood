export const MOODS = [
  { id: 'romance',    label: 'Romance',    emoji: '💕', keywords: ['romance','love story','love stories','romantic','enemies to lovers','rivals','sports romance','contemporary romance','m/m','lgbtq romance'] },
  { id: 'happy',      label: 'Happy',      emoji: '🌞', keywords: ['humor','humorous','comedy','feel-good','feel good','romantic comedy','rom-com','friendship','uplifting'] },
  { id: 'cozy',       label: 'Cozy',       emoji: '🧸', keywords: ['cozy','cosy','small town','bakery','village','slice of life','heartwarming','found family'] },
  { id: 'funny',      label: 'Funny',      emoji: '😂', keywords: ['humor','humorous','comedy','satire','funny','witty'] },
  { id: 'adventurous',label: 'Adventurous',emoji: '🗺️', keywords: ['adventure','quest','fantasy','epic','travel','survival','action'] },
  { id: 'mysterious', label: 'Mysterious', emoji: '🔍', keywords: ['mystery','detective','crime','thriller','suspense','whodunit','murder'] },
  { id: 'dark',       label: 'Dark',       emoji: '🌑', keywords: ['dark','horror','psychological','gothic','dystopian','noir','crime'] },
  { id: 'emotional',  label: 'Emotional',  emoji: '🥹', keywords: ['grief','loss','family','coming of age','drama','death','tearjerker','war'] },
  { id: 'thoughtful', label: 'Thoughtful', emoji: '💭', keywords: ['philosophy','literary','essays','psychology','science','history','non-fiction','nonfiction','biography','memoir'] },
  { id: 'spooky',     label: 'Spooky',     emoji: '👻', keywords: ['horror','ghost','ghosts','haunted','supernatural','vampires','witches'] },
  { id: 'inspiring',  label: 'Inspiring',  emoji: '✨', keywords: ['self-help','motivational','inspirational','success','personal growth','biography','memoir'] },
] as const;

export type Mood = (typeof MOODS)[number];
export type MoodId = Mood['id'];

export function getMood(id: string): Mood | undefined {
  return MOODS.find((mood) => mood.id === id);
}
