// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_BASE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
