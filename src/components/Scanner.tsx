import { useEffect, useRef, useState } from 'react';
import { startScanner, type CameraError } from '../lib/barcode';
import '../styles/scanner.css';

type CameraState = 'starting' | 'on' | CameraError;

const ERROR_TEXT: Record<CameraError, string> = {
  denied: "I can't use the camera — permission was denied. You can allow it in your browser settings, or type the ISBN below ♡",
  unavailable: "I couldn't find a camera to use. Type the ISBN below instead ♡",
  insecure: 'The camera only works over HTTPS. Open the https:// link, or type the ISBN below ♡',
};

interface ScannerProps {
  /** Camera runs only while active. */
  active: boolean;
  onIsbn: (isbn13: string) => void;
  /** A barcode that isn't an ISBN, e.g. a shop sticker. */
  onOtherCode?: (code: string) => void;
  /** Increment to flash the frame pink (e.g. after a successful scan). */
  flashKey: number;
}

export default function Scanner({ active, onIsbn, onOtherCode, flashKey }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onIsbnRef = useRef(onIsbn);
  const onOtherRef = useRef(onOtherCode);
  const [state, setState] = useState<CameraState>('starting');

  useEffect(() => {
    onIsbnRef.current = onIsbn;
    onOtherRef.current = onOtherCode;
  }, [onIsbn, onOtherCode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    let cancelled = false;
    let stop: (() => void) | undefined;

    startScanner(
      video,
      (isbn) => onIsbnRef.current(isbn),
      (code) => onOtherRef.current?.(code),
    ).then(
      (handle) => {
        if (cancelled) handle.stop();
        else {
          stop = handle.stop;
          setState('on');
        }
      },
      (error: CameraError) => !cancelled && setState(error),
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active]);

  const error = state !== 'starting' && state !== 'on' ? state : undefined;

  return (
    <div className={`viewfinder ${active ? '' : 'is-paused'}`}>
      <video ref={videoRef} className="viewfinder-video" muted playsInline aria-label="Camera preview" />
      {/* key restarts the flash animation on every successful scan */}
      <div key={flashKey} className={`viewfinder-frame ${flashKey ? 'flash' : ''}`} aria-hidden="true">
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      </div>
      <p className="viewfinder-help hand">
        {error ? ERROR_TEXT[error] : !active ? 'Camera paused' : state === 'starting' ? 'Starting camera…' : 'Hold the barcode inside the frame ♡'}
      </p>
    </div>
  );
}
