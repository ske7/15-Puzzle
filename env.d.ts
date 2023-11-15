// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_BASE_API_URL: string;
  readonly VITE_GAME_KEY: number;
  readonly VITE_BASE_API_URL: string;
  readonly VITE_TP3P3_1: string;
  readonly VITE_TP3P3_2: string;
  readonly VITE_TP3P3_3: string;
  readonly VITE_TP3P3_4: string;
  readonly VITE_TP3P3_5: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
