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

export async function readBackCover(photo: Blob, onProgress: (fraction: number) => void = () => {}): Promise<string> {
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
    const { data } = await worker.recognize(await prepareImage(photo));
    return cleanOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}
