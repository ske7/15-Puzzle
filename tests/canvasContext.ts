import { vi } from 'vitest';

// The subset of the 2D context that tests/setup.ts stubs out, which is exactly what the
// pro board's renderer touches.
export interface StubCanvasContext {
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  font: string;
  fillStyle: string;
}

// Reading the stub's recorded results is how drawing is asserted. This reference to the
// prototype method is metadata only - it is never called detached from an element.
// eslint-disable-next-line @typescript-eslint/unbound-method
const stub = () => vi.mocked(HTMLCanvasElement.prototype.getContext);

// The context handed out by the most recent getContext call. A resize asks for a new one,
// so a test that changes board geometry has to re-read rather than hold an earlier one.
export function lastCanvasContext(): StubCanvasContext {
  return stub().mock.results.at(-1)!.value as StubCanvasContext;
}

export function forgetCanvasContexts(): void {
  stub().mockClear();
}

// The real browser condition of a canvas that cannot hand out another context.
export function refuseNextCanvasContext(): void {
  stub().mockReturnValueOnce(null);
}
