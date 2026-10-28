// Opens a back camera that can actually focus on a barcode, and exposes zoom, torch and
// tap-to-focus where the phone supports them (mostly Android Chrome; iPhone Safari offers little
// of this, so everything here is optional and fails quietly).

/** Camera features browsers report but TypeScript's DOM types don't list yet. */
interface ExtraCapabilities {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
}
type Capabilities = MediaTrackCapabilities & ExtraCapabilities;
type ExtraConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
  zoom?: number;
  torch?: boolean;
  pointsOfInterest?: { x: number; y: number }[];
};

export interface CameraControls {
  /** Zoom range, if the camera can zoom. */
  zoom?: { min: number; max: number };
  setZoom: (value: number) => Promise<void>;
  hasTorch: boolean;
  setTorch: (on: boolean) => Promise<void>;
  /** Focus on a point of the picture (x, y from 0 to 1), then go back to continuous focus. */
  focusAt: (x: number, y: number) => Promise<void>;
}

// Full HD helps decoding small barcodes; the browser picks the closest the camera offers.
const VIDEO: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };

const capabilitiesOf = (track: MediaStreamTrack): Capabilities | undefined => {
  try {
    return track.getCapabilities?.() as Capabilities | undefined;
  } catch {
    return undefined;
  }
};

export const hasContinuousFocus = (caps?: Capabilities) => Boolean(caps?.focusMode?.includes('continuous'));

/**
 * Back cameras to try, best guess first. Phones with several back lenses often list the ultra-wide
 * lens first, and it can't focus up close; the main lens is usually "camera 0" / "camera2 0".
 */
export function orderBackCameras(devices: Pick<MediaDeviceInfo, 'deviceId' | 'label' | 'kind'>[]): string[] {
  const back = devices.filter((d) => d.kind === 'videoinput' && !/front|user|vorder|selfie/i.test(d.label));
  const score = (label: string) => (/\b(camera2? )?0\b/i.test(label) ? 0 : /wide|ultra|tele|macro|depth/i.test(label) ? 2 : 1);
  return back.sort((a, b) => score(a.label) - score(b.label)).map((d) => d.deviceId);
}

async function apply(track: MediaStreamTrack, constraints: ExtraConstraints): Promise<void> {
  try {
    await track.applyConstraints({ advanced: [constraints] } as MediaTrackConstraints);
  } catch {
    // not supported on this camera: fine
  }
}

/**
 * Opens the back camera. If the one the browser picked can't autofocus (often the ultra-wide lens),
 * tries the other back cameras and keeps the first that can.
 */
export async function openBackCamera(): Promise<MediaStream> {
  let stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...VIDEO, facingMode: { ideal: 'environment' } } });
  const first = stream.getVideoTracks()[0];
  const caps = capabilitiesOf(first);

  // No capability info (e.g. iPhone Safari) or already a focusing camera: keep it.
  if (caps && caps.focusMode && !hasContinuousFocus(caps)) {
    const current = first.getSettings().deviceId;
    const candidates = orderBackCameras(await navigator.mediaDevices.enumerateDevices()).filter((id) => id !== current).slice(0, 4);
    for (const deviceId of candidates) {
      let other: MediaStream | undefined;
      try {
        other = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...VIDEO, deviceId: { exact: deviceId } } });
      } catch {
        continue;
      }
      if (hasContinuousFocus(capabilitiesOf(other.getVideoTracks()[0]))) {
        stream.getTracks().forEach((t) => t.stop());
        stream = other;
        break;
      }
      other.getTracks().forEach((t) => t.stop());
    }
  }

  const track = stream.getVideoTracks()[0];
  if (hasContinuousFocus(capabilitiesOf(track))) await apply(track, { focusMode: 'continuous' });
  return stream;
}

export function cameraControls(stream: MediaStream): CameraControls {
  const track = stream.getVideoTracks()[0];
  const caps = capabilitiesOf(track);
  const zoom = caps?.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : undefined;
  const canPointFocus = Boolean(caps?.focusMode?.some((mode) => mode === 'single-shot' || mode === 'manual'));
  let refocusTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    zoom,
    setZoom: (value) => (zoom ? apply(track, { zoom: Math.min(zoom.max, Math.max(zoom.min, value)) }) : Promise.resolve()),
    hasTorch: Boolean(caps?.torch),
    setTorch: (on) => apply(track, { torch: on }),
    focusAt: async (x, y) => {
      if (!canPointFocus) return;
      await apply(track, { pointsOfInterest: [{ x, y }], focusMode: 'single-shot' });
      clearTimeout(refocusTimer);
      if (hasContinuousFocus(caps)) refocusTimer = setTimeout(() => void apply(track, { focusMode: 'continuous' }), 2000);
    },
  };
}
