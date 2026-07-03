/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed Cloudflare Worker API (empty = localStorage demo mode). */
  readonly PUBLIC_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
