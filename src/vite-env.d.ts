/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override: `true` / `1` / `yes` or `false` / `0` / `no`. If unset, uses `import.meta.env.DEV`. */
  readonly VITE_IS_LOCAL?: string
}
