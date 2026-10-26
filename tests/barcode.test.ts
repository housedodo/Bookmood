import { cameraErrorKind, createScanGate } from '../src/lib/barcode';

describe('scan gate', () => {
  it('lets a code through once, then ignores it for 3 seconds', () => {
    const gate = createScanGate(3000);
    expect(gate('9780593334836', 0)).toBe(true);
    expect(gate('9780593334836', 1000)).toBe(false);
    expect(gate('9780306406157', 1000)).toBe(true); // a different book is fine
    expect(gate('9780593334836', 5000)).toBe(true);
  });

  it('counts the 3 seconds from the last accepted scan', () => {
    const gate = createScanGate(3000);
    gate('9780593334836', 0);
    expect(gate('9780593334836', 2900)).toBe(false);
    expect(gate('9780593334836', 3000)).toBe(true);
    expect(gate('9780593334836', 4000)).toBe(false);
  });
});

describe('cameraErrorKind', () => {
  it('maps browser errors', () => {
    expect(cameraErrorKind(new DOMException('no', 'NotAllowedError'))).toBe('denied');
    expect(cameraErrorKind(new DOMException('none', 'NotFoundError'))).toBe('unavailable');
  });
});
