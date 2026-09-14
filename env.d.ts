// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_BASE_API_URL: string;
  readonly VITE_GAME_KEY: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Exposed only in a dedicated "test" Vite mode (see main.ts) so the Playwright E2E suite
// can read real store state - absent from dev/production builds.
interface Window {
  __cage15Test__?: {
    getMixedOrders: () => number[];
    getCurrentOrders: () => number[];
    getNumLines: () => number;
  };
}
