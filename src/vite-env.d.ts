/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORTAL_HOME_URL?: string;
  readonly VITE_ORAN_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
