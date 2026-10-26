import type { LookupOptions } from './lookup';

export interface CoverTheme {
  coverBlob?: Blob;
  themeHue: number;
}

/** Downloads the first cover URL that returns an image. Never throws. */
export async function downloadCover(urls: string[], options: LookupOptions = {}): Promise<Blob | undefined> {
  const { fetchImpl = fetch, timeoutMs = 8000 } = options;
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) continue;
      const blob = await response.blob();
      // Tiny images are usually "no cover" placeholders (e.g. Google's 1×1 gifs).
      if (blob.type.startsWith('image/') && blob.size > 1000) return blob;
    } catch {
      // try the next URL
    } finally {
      clearTimeout(timer);
    }
  }
  return undefined;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/**
 * Average hue of the colorful pixels in RGBA data, weighted by saturation.
 * Near-white, near-black and gray pixels are ignored. Returns null if nothing colorful is left.
 * Hue is an angle, so it is averaged as a vector (350° and 10° average to 0°, not 180°).
 */
export function hueFromPixels(data: Uint8ClampedArray): number | null {
  let x = 0;
  let y = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.2 || l < 0.12 || l > 0.92) continue;
    const rad = (h * Math.PI) / 180;
    x += Math.cos(rad) * s;
    y += Math.sin(rad) * s;
  }
  if (Math.hypot(x, y) < 1e-6) return null;
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

/** Stable pastel-friendly hue from a title: roses/peaches (320–40) or lavender (250–290). */
export function hueFromTitle(title: string): number {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  const slot = hash % 120;
  return slot < 80 ? (320 + slot) % 360 : 250 + (slot - 80);
}

/** Draws the image at 32×32 and reads its pixels. Returns null if the browser can't (or the canvas is tainted). */
async function readPixels(blob: Blob): Promise<Uint8ClampedArray | null> {
  try {
    // No resize options here: older iOS Safari ignores them. drawImage does the scaling.
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 32, 32);
    bitmap.close();
    return ctx.getImageData(0, 0, 32, 32).data;
  } catch {
    return null;
  }
}

export async function hueFromBlob(blob: Blob): Promise<number | null> {
  const pixels = await readPixels(blob);
  return pixels ? hueFromPixels(pixels) : null;
}

/** Downloads the cover and picks the book's theme hue, falling back to a hue from the title. */
export async function getCoverTheme(
  coverUrls: string[],
  title: string,
  options: LookupOptions = {},
): Promise<CoverTheme> {
  const coverBlob = await downloadCover(coverUrls, options);
  const hue = coverBlob ? await hueFromBlob(coverBlob) : null;
  return { coverBlob, themeHue: hue ?? hueFromTitle(title) };
}
