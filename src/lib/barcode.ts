import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { isValidIsbn13, normalizeIsbn } from './isbn';

export type CameraError = 'denied' | 'unavailable' | 'insecure';

export interface ScannerHandle {
  stop: () => void;
}

const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
};

// Book barcodes are EAN-13. The others are read only to notice shop stickers and say so.
const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'code_128'];
const ZXING_FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128];

/** Minimal typing for the BarcodeDetector API (Chrome on Android, not iOS Safari). */
interface DetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
interface DetectorClass {
  new (options: { formats: string[] }): DetectorLike;
  getSupportedFormats: () => Promise<string[]>;
}

async function nativeDetector(): Promise<DetectorLike | null> {
  const Detector = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const supported = await Detector.getSupportedFormats();
    if (!supported.includes('ean_13')) return null;
    return new Detector({ formats: DETECTOR_FORMATS.filter((f) => supported.includes(f)) });
  } catch {
    return null;
  }
}

/** Fast path: BarcodeDetector polling the video ~6 times per second. */
async function startNative(video: HTMLVideoElement, detector: DetectorLike, onCode: (code: string) => void): Promise<ScannerHandle> {
  const stream = await navigator.mediaDevices.getUserMedia(CAMERA);
  video.srcObject = stream;
  await video.play();
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      if (video.readyState >= 2) {
        for (const barcode of await detector.detect(video)) onCode(barcode.rawValue);
      }
    } catch {
      // a single failed frame is fine
    }
    if (!stopped) setTimeout(tick, 160);
  };
  void tick();
  return {
    stop: () => {
      stopped = true;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

/** Fallback that works everywhere, including iPhone Safari. */
async function startZxing(video: HTMLVideoElement, onCode: (code: string) => void): Promise<ScannerHandle> {
  const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS]]);
  const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 300 });
  const controls = await reader.decodeFromConstraints(CAMERA, video, (result) => {
    if (result) onCode(result.getText());
  });
  return { stop: () => controls.stop() };
}

export function cameraErrorKind(error: unknown): CameraError {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  return 'unavailable';
}

/**
 * Opens the back camera and calls onIsbn for every valid ISBN-13 it sees.
 * Any other barcode (e.g. a shop price sticker) goes to onOther. Rejects with a CameraError.
 */
export async function startScanner(
  video: HTMLVideoElement,
  onIsbn: (isbn13: string) => void,
  onOther: (code: string) => void = () => {},
): Promise<ScannerHandle> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw 'insecure' satisfies CameraError;
  // iOS needs these before the stream starts, or the video opens fullscreen / stays black.
  video.setAttribute('playsinline', 'true');
  video.muted = true;

  const onCode = (code: string) => {
    const isbn = normalizeIsbn(code);
    if (isValidIsbn13(isbn)) onIsbn(isbn);
    else onOther(code);
  };
  try {
    const detector = await nativeDetector();
    return detector ? await startNative(video, detector, onCode) : await startZxing(video, onCode);
  } catch (error) {
    throw cameraErrorKind(error);
  }
}

/** Lets each ISBN through once per `windowMs` (the camera sees the same code many times per second). */
export function createScanGate(windowMs = 3000) {
  const lastSeen = new Map<string, number>();
  return (isbn: string, now = Date.now()): boolean => {
    const last = lastSeen.get(isbn);
    if (last !== undefined && now - last < windowMs) return false;
    lastSeen.set(isbn, now);
    return true;
  };
}
