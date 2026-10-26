import { downloadCover, hueFromPixels, hueFromTitle } from '../src/lib/cover';

function pixels(...colors: [number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(colors.flatMap(([r, g, b]) => [r, g, b, 255]));
}

describe('cover theme', () => {
  it('finds the hue of colorful pixels', () => {
    expect(hueFromPixels(pixels([40, 90, 200], [40, 90, 200]))).toBeCloseTo(221, -1);
    expect(hueFromPixels(pixels([200, 30, 30]))).toBe(0);
  });

  it('ignores white, black and gray pixels', () => {
    const blueOnWhite = pixels([255, 255, 255], [0, 0, 0], [128, 128, 128], [40, 90, 200]);
    expect(hueFromPixels(blueOnWhite)).toBeCloseTo(221, -1);
    expect(hueFromPixels(pixels([255, 255, 255], [10, 10, 10], [120, 120, 120]))).toBeNull();
  });

  it('averages hues around the circle (red + pink stays red-ish, not cyan)', () => {
    const hue = hueFromPixels(pixels([220, 30, 60], [220, 40, 20]))!;
    expect(hue > 340 || hue < 20).toBe(true);
  });

  it('gives a stable pastel-friendly hue from the title', () => {
    for (const title of ['Book Lovers', 'Ice & Ember', 'A', 'Midnight Library Club']) {
      const hue = hueFromTitle(title);
      expect(hue).toBe(hueFromTitle(title));
      expect(hue >= 320 || hue <= 40 || (hue >= 250 && hue <= 290)).toBe(true);
    }
  });

  it('downloads the first real image and skips 404s and tiny placeholders', async () => {
    const image = (size: number, type: string) =>
      new Response(new Uint8Array(size), { status: 200, headers: { 'Content-Type': type } });
    const responses: Record<string, Response> = {
      a: new Response('', { status: 404 }),
      b: image(40, 'image/gif'),
      c: image(5000, 'image/jpeg'),
    };
    const fetchImpl: typeof fetch = async (input) => responses[String(input)];
    const blob = await downloadCover(['a', 'b', 'c'], { fetchImpl });
    expect(blob?.size).toBe(5000);
    expect(await downloadCover(['a'], { fetchImpl })).toBeUndefined();
  });
});
