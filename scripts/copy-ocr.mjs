// Copies the text-recognition files (Tesseract) into public/ocr/, so the app serves them itself
// instead of loading them from a CDN. Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const out = join(dirname(new URL(import.meta.url).pathname), '..', 'public', 'ocr');
mkdirSync(out, { recursive: true });

const files = [
  [pkgDir('tesseract.js'), 'dist/worker.min.js'],
  // The worker picks one of these depending on what the phone's browser supports.
  [pkgDir('tesseract.js-core'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  [pkgDir('tesseract.js-core'), 'tesseract-core-simd-lstm.wasm.js'],
  [pkgDir('tesseract.js-core'), 'tesseract-core-lstm.wasm.js'],
  // English + German, the compact "best_int" models (~4 MB together).
  [pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int/eng.traineddata.gz'],
  [pkgDir('@tesseract.js-data/deu'), '4.0.0_best_int/deu.traineddata.gz'],
];

for (const [dir, file] of files) copyFileSync(join(dir, file), join(out, file.split('/').pop()));
console.log(`OCR files copied to ${out}`);
