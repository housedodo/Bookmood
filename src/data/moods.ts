// Keywords are matched as whole words, case-insensitive (see src/lib/text.ts).
// A trailing "*" matches the start of a word, mainly for German compounds ("liebes*" → "Liebesroman").
// Each list: the original English keywords, then trope keywords, then German ones, then
// "blurb words": what back covers and subtitles actually say ("twisty", "herzzerreißend").
export const MOODS = [
  { id: 'romance', label: 'Romance', emoji: '💕', keywords: [
    'romance', 'love story', 'love stories', 'romantic', 'enemies to lovers', 'rivals', 'sports romance', 'contemporary romance', 'm/m', 'lgbtq romance',
    'romantasy', 'rivals to lovers', 'friends to lovers', 'fake dating', 'second chance*', 'slow burn', 'forbidden love', 'grumpy sunshine', 'forced proximity', 'love triangle',
    'liebe', 'liebes*', 'romanze', 'romantisch*', 'verliebt*', 'verlieben', 'rivalen', 'feinde zu liebenden',
    'love', 'lovers', 'kiss*', 'swoon*', 'steamy', 'spicy', 'chemistry', 'falling for', 'heartthrob', 'küss*', 'prickel*', 'knister*', 'verliebe*', 'herzklopfen',
  ] },
  { id: 'happy', label: 'Happy', emoji: '🌞', keywords: [
    'humor', 'humorous', 'comedy', 'feel-good', 'feel good', 'romantic comedy', 'rom-com', 'friendship', 'uplifting',
    'humorvoll*', 'komödie', 'heiter*', 'gute laune', 'wohlfühl*', 'freundschaft*', 'herzerwärmend*',
    'joy', 'joyful', 'joyous', 'delightful', 'charming', 'hopeful', 'sunny', 'warm-hearted', 'fröhlich*', 'charmant*', 'zauberhaft*', 'lebensfroh*', 'hoffnungsvoll*',
  ] },
  { id: 'cozy', label: 'Cozy', emoji: '🧸', keywords: [
    'cozy', 'cosy', 'small town', 'bakery', 'village', 'slice of life', 'heartwarming', 'found family',
    'christmas', 'cozy mystery',
    'gemütlich*', 'kleinstadt*', 'dorf', 'dorfes', 'bäckerei*', 'café', 'herzerwärmend*', 'wohlfühl*', 'wahlfamilie', 'weihnacht*',
    'comforting', 'bookshop', 'bookstore', 'cottage', 'snowed in', 'tea shop', 'buchladen*', 'buchhandlung*', 'kuschel*', 'hütte', 'teestube',
  ] },
  { id: 'funny', label: 'Funny', emoji: '😂', keywords: [
    'humor', 'humorous', 'comedy', 'satire', 'funny', 'witty',
    'humorvoll*', 'lustig*', 'witzig*', 'komisch*', 'satiri*', 'komödie',
    'hilarious', 'laugh-out-loud', 'laugh out loud', 'laugh*', 'comic', 'comedic', 'banter', 'quirky', 'absurd', 'urkomisch*', 'zum brüllen', 'schräg*', 'lachen', 'zum lachen', 'skurril*',
  ] },
  { id: 'adventurous', label: 'Adventurous', emoji: '🗺️', keywords: [
    'adventure', 'quest', 'fantasy', 'epic', 'travel', 'survival', 'action',
    'romantasy', 'time travel',
    'abenteuer*', 'reise*', 'überleben*', 'episch*', 'expedition*', 'zeitreise*',
    'journey', 'magic', 'magical', 'dragon*', 'kingdom', 'heist', 'treasure', 'explore*', 'wilderness', 'swashbuckling', 'magie', 'magisch*', 'drache*', 'königreich*', 'schatz*', 'wildnis',
  ] },
  { id: 'mysterious', label: 'Mysterious', emoji: '🔍', keywords: [
    'mystery', 'detective', 'crime', 'thriller', 'suspense', 'whodunit', 'murder',
    'krimi*', 'kriminal*', 'mord', 'morde', 'mordes', 'mordfall', 'mörder*', 'detektiv*', 'kommissar*', 'ermittl*', 'spannung*', 'geheimnis*',
    'twist*', 'gripping', 'page-turner', 'page turner', 'unputdownable', 'secret*', 'missing', 'disappear*', 'vanish*', 'killer', 'investigat*', 'clue*', 'suspect*', 'whodunnit', 'spannend*', 'fesselnd*', 'verschwunden*', 'verschwinden', 'rätsel*', 'leiche*', 'täter*', 'verdächtig*', 'wendung*',
  ] },
  { id: 'dark', label: 'Dark', emoji: '🌑', keywords: [
    'dark', 'horror', 'psychological', 'gothic', 'dystopian', 'noir', 'crime',
    'dark academia', 'dark romance', 'mafia',
    'düster*', 'psychothriller', 'dystopi*', 'abgrund*', 'gotisch*',
    'chilling', 'sinister', 'obsession', 'obsessive', 'revenge', 'disturbing', 'twisted', 'menacing', 'brutal', 'violent', 'abgründig*', 'rache*', 'besessen*', 'verstörend*', 'grausam*', 'brutal*', 'finster*', 'bedrohlich*',
  ] },
  { id: 'emotional', label: 'Emotional', emoji: '🥹', keywords: [
    'grief', 'loss', 'family', 'coming of age', 'drama', 'death', 'tearjerker', 'war',
    'trauer*', 'verlust*', 'familie', 'familien*', 'erwachsenwerden', 'tod', 'todes', 'sterben', 'krieg*', 'schicksal*',
    'heartbreaking', 'heart-wrenching', 'heartwrenching', 'moving', 'poignant', 'tears', 'unforgettable', 'devastating', 'tender', 'bewegend*', 'berührend*', 'herzzerreißend*', 'tränen', 'ergreifend*', 'abschied*',
  ] },
  { id: 'thoughtful', label: 'Thoughtful', emoji: '💭', keywords: [
    'philosophy', 'literary', 'essays', 'psychology', 'science', 'history', 'non-fiction', 'nonfiction', 'biography', 'memoir',
    'philosoph*', 'essay*', 'psychologie', 'wissenschaft*', 'sachbuch*', 'biografie*', 'biographie*', 'zeitgeschichte',
    'thought-provoking', 'profound', 'insightful', 'reflective', 'society', 'humanity', 'nachdenklich*', 'tiefgründig*', 'gesellschaft*', 'menschlichkeit',
  ] },
  { id: 'spooky', label: 'Spooky', emoji: '👻', keywords: [
    'horror', 'ghost', 'ghosts', 'haunted', 'supernatural', 'vampires', 'witches',
    'vampire', 'witch', 'paranormal',
    'grusel*', 'gespenst*', 'geister', 'spuk*', 'übernatürlich*', 'vampir*', 'hexe', 'hexen*',
    'haunting', 'eerie', 'creepy', 'spine-chilling', 'curse*', 'demon*', 'possessed', 'unheimlich*', 'fluch*', 'verflucht*', 'dämon*',
  ] },
  { id: 'inspiring', label: 'Inspiring', emoji: '✨', keywords: [
    'self-help', 'motivational', 'inspirational', 'success', 'personal growth', 'biography', 'memoir',
    'ratgeber*', 'selbsthilfe', 'motivation*', 'inspirier*', 'erfolg*', 'persönlichkeitsentwicklung', 'biografie*', 'mutig*',
    'empowering', 'courage*', 'resilience', 'hope', 'life-changing', 'transform*', 'dream*', 'mutmach*', 'hoffnung*', 'träume', 'stärke',
  ] },
] as const;

export type Mood = (typeof MOODS)[number];
export type MoodId = Mood['id'];

export function getMood(id: string): Mood | undefined {
  return MOODS.find((mood) => mood.id === id);
}
