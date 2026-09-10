/// <reference types="vite/client" />

// Types the custom VITE_APP_URL env var (config.ts) — vite/client's own
// ImportMetaEnv only declares the built-ins (MODE/DEV/PROD/etc.), so a
// project-specific var needs to be added here or tsc reports it missing.
interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
