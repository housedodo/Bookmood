// Reads the text on a photo of a book's back cover, on the phone itself (Tesseract, English + German).
// The recognition files are served by the app from /ocr/ (see scripts/copy-ocr.mjs) and
// only downloaded the first time this is used.

const MAX_SIDE = 1600; // phone photos are huge; this size is plenty for printed text and much faster

/** Shrinks the photo and turns it gray, which makes recognition faster and a bit more accurate. */
async function prepareImage(photo: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.filter = 'grayscale(1) contrast(1.2)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/**
 * Tidies raw recognition output: joins words split across lines ("Liebes-\ngeschichte"),
 * drops lines that are mostly noise (barcodes, prices, logos) and joins the rest into one text.
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, '$1$2')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      const letters = (line.match(/\p{L}/gu) ?? []).length;
      return line.length >= 4 && letters / line.length >= 0.6 && /\p{L}{3}/u.test(line);
    })
    .join(' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export interface OcrLine {
  text: string;
  /** Height of the line in pixels: big letters on a cover are usually the title and author. */
  height: number;
  confidence: number;
}

// Things printed on front covers that aren't the title or author.
const COVER_NOISE = /bestsell|new york times|sunday times|spiegel|#\s*1|author of|a novel|^roman$|international|edition|winner|prize|book club|copies|now a major|netflix|tiktok|booktok|sensation|^the$|^a$/i;

/**
 * Picks what to search for from the text on a front cover: the biggest lines (title, author),
 * minus marketing lines and recognition noise. Returns '' if nothing usable was read.
 */
export function coverSearchText(lines: OcrLine[]): string {
  const usable = lines
    .map((line) => ({ ...line, text: line.text.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}!?']+$/gu, '').trim() }))
    .filter((line) => {
      const letters = (line.text.match(/\p{L}/gu) ?? []).length;
      return letters >= 3 && letters / line.text.length >= 0.6 && line.confidence >= 40 && !COVER_NOISE.test(line.text);
    });
  const biggest = [...usable].sort((a, b) => b.height - a.height).slice(0, 3);
  // Keep the cover's top-to-bottom order for the chosen lines.
  return usable
    .filter((line) => biggest.includes(line))
    .map((line) => line.text)
    .join(' ')
    .slice(0, 80)
    .trim();
}

async function recognize(photo: Blob, onProgress: (fraction: number) => void, withLines: boolean) {
  const { createWorker } = await import('tesseract.js');
  const base = new URL('ocr/', document.baseURI).href;
  const worker = await createWorker(['eng', 'deu'], 1, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base,
    gzip: true,
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress(message.progress);
    },
  });
  try {
    const { data } = await worker.recognize(await prepareImage(photo), {}, { text: true, blocks: withLines });
    return data;
  } finally {
    await worker.terminate();
  }
}

export async function readBackCover(photo: Blob, onProgress: (fraction: number) => void = () => {}): Promise<string> {
  return cleanOcrText((await recognize(photo, onProgress, false)).text);
}

/** Reads the title and author from a photo of the front cover, as a search text. */
export async function readFrontCover(photo: Blob, onProgress: (fraction: number) => void = () => {}): Promise<string> {
  const data = await recognize(photo, onProgress, true);
  const lines: OcrLine[] = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({ text: line.text, height: line.bbox.y1 - line.bbox.y0, confidence: line.confidence })),
    ),
  );
  return coverSearchText(lines);
}
