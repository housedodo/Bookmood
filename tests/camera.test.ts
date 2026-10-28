import { cameraControls, hasContinuousFocus, openBackCamera, orderBackCameras } from '../src/lib/camera';

/** A fake camera track with the given capabilities. */
function fakeStream(deviceId: string, caps: Record<string, unknown> | undefined) {
  const applied: unknown[] = [];
  const track = {
    stop: vi.fn(),
    getCapabilities: caps ? () => caps : undefined,
    getSettings: () => ({ deviceId }),
    applyConstraints: vi.fn(async (c: unknown) => {
      applied.push(c);
    }),
  };
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  return { stream, track, applied };
}

describe('camera choice', () => {
  it('orders back cameras: main lens first, ultra-wide/tele last, front ones out', () => {
    const devices = [
      { deviceId: 'uw', label: 'camera2 2, facing back (ultra wide)', kind: 'videoinput' as const },
      { deviceId: 'front', label: 'camera2 1, facing front', kind: 'videoinput' as const },
      { deviceId: 'main', label: 'camera2 0, facing back', kind: 'videoinput' as const },
      { deviceId: 'mic', label: 'Microphone', kind: 'audioinput' as const },
    ];
    expect(orderBackCameras(devices)).toEqual(['main', 'uw']);
  });

  it('knows which cameras can autofocus', () => {
    expect(hasContinuousFocus({ focusMode: ['continuous', 'manual'] } as MediaTrackCapabilities)).toBe(true);
    expect(hasContinuousFocus({ focusMode: ['fixed'] } as MediaTrackCapabilities)).toBe(false);
    expect(hasContinuousFocus(undefined)).toBe(false);
  });

  it('switches away from a fixed-focus lens (e.g. ultra-wide) to one that autofocuses', async () => {
    const ultraWide = fakeStream('uw', { focusMode: ['fixed'] });
    const main = fakeStream('main', { focusMode: ['continuous', 'single-shot'], zoom: { min: 1, max: 8 }, torch: true });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async (c: MediaStreamConstraints) =>
          JSON.stringify(c).includes('"exact":"main"') ? main.stream : ultraWide.stream,
        ),
        enumerateDevices: async () => [
          { deviceId: 'uw', label: 'camera2 2, facing back', kind: 'videoinput' },
          { deviceId: 'main', label: 'camera2 0, facing back', kind: 'videoinput' },
        ],
      },
    });
    const stream = await openBackCamera();
    expect(stream).toBe(main.stream);
    expect(ultraWide.track.stop).toHaveBeenCalled();
    expect(main.applied).toContainEqual({ advanced: [{ focusMode: 'continuous' }] });

    const controls = cameraControls(stream);
    expect(controls.zoom).toEqual({ min: 1, max: 8 });
    expect(controls.hasTorch).toBe(true);
    await controls.setZoom(20);
    expect(main.applied).toContainEqual({ advanced: [{ zoom: 8 }] });
    vi.unstubAllGlobals();
  });

  it('keeps the camera as is when the browser reports nothing (iPhone Safari)', async () => {
    const plain = fakeStream('cam', undefined);
    const getUserMedia = vi.fn(async () => plain.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices: async () => [] } });
    expect(await openBackCamera()).toBe(plain.stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    const controls = cameraControls(plain.stream);
    expect(controls.zoom).toBeUndefined();
    expect(controls.hasTorch).toBe(false);
    vi.unstubAllGlobals();
  });
});
