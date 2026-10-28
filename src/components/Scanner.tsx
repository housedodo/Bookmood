import { useEffect, useRef, useState } from 'react';
import { startScanner, type CameraError } from '../lib/barcode';
import type { CameraControls } from '../lib/camera';
import Icon from './Icon';
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
  const [camera, setCamera] = useState<CameraControls>();
  const [zoomed, setZoomed] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number }>();

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
          setCamera(handle.camera);
          setZoomed(false);
          setTorchOn(false);
          setState('on');
        }
      },
      (error: CameraError) => !cancelled && setState(error),
    );
    return () => {
      cancelled = true;
      stop?.();
      setCamera(undefined);
    };
  }, [active]);

  // 2× lets you hold the book further away, where the lens can focus, while the barcode stays big.
  const zoomTo = camera?.zoom && camera.zoom.max >= 1.5 ? Math.min(2, camera.zoom.max) : undefined;
  const toggleZoom = () => {
    if (!camera || !zoomTo) return;
    void camera.setZoom(zoomed ? 1 : zoomTo);
    setZoomed(!zoomed);
  };
  const toggleTorch = () => {
    if (!camera) return;
    void camera.setTorch(!torchOn);
    setTorchOn(!torchOn);
  };
  const tapToFocus = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!camera) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    void camera.focusAt(x, y);
    setFocusPoint({ x, y, key: Date.now() });
  };

  const error = state !== 'starting' && state !== 'on' ? state : undefined;

  return (
    <div className={`viewfinder ${active ? '' : 'is-paused'}`} onPointerUp={tapToFocus}>
      <video ref={videoRef} className="viewfinder-video" muted playsInline aria-label="Camera preview" />
      {focusPoint && (
        <span
          key={focusPoint.key}
          className="focus-ring"
          style={{ left: `${focusPoint.x * 100}%`, top: `${focusPoint.y * 100}%` }}
          aria-hidden="true"
        />
      )}
      {camera && state === 'on' && (zoomTo || camera.hasTorch) && (
        <div className="camera-buttons" onPointerUp={(e) => e.stopPropagation()}>
          {zoomTo && (
            <button type="button" className="camera-button" aria-pressed={zoomed} onClick={toggleZoom} aria-label={zoomed ? 'Zoom out' : 'Zoom in 2×'}>
              {zoomed ? '1×' : '2×'}
            </button>
          )}
          {camera.hasTorch && (
            <button type="button" className="camera-button" aria-pressed={torchOn} onClick={toggleTorch} aria-label={torchOn ? 'Light off' : 'Light on'}>
              <Icon name="torch" />
            </button>
          )}
        </div>
      )}
      {/* key restarts the flash animation on every successful scan */}
      <div key={flashKey} className={`viewfinder-frame ${flashKey ? 'flash' : ''}`} aria-hidden="true">
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      </div>
      <p className="viewfinder-help hand">
        {error
          ? ERROR_TEXT[error]
          : !active
            ? 'Camera paused'
            : state === 'starting'
              ? 'Starting camera…'
              : camera && (zoomTo || camera.hasTorch)
                ? 'Hold the barcode in the frame · blurry? tap it or try 2× ♡'
                : 'Hold the barcode in the frame, a hand’s width away ♡'}
      </p>
    </div>
  );
}
