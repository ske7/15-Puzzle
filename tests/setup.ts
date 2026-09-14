import { vi } from 'vitest';

class ResizeObserverStub {
  observe(): void {
    return undefined;
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    return undefined;
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// jsdom has no real 2D rendering; the pro board draws its tiles onto a real <canvas>, so
// getContext('2d') needs a stub covering the small subset of CanvasRenderingContext2D
// it actually calls.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  scale: vi.fn(),
  setTransform: vi.fn(),
  fillText: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  font: '',
  textBaseline: '',
  textAlign: '',
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
