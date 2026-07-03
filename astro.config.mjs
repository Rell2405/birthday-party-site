// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site lives at https://<user>.github.io/<repo>/.
// `base` is injected by the deploy workflow (BASE_PATH) so local dev stays at "/".
// Normalise to a leading+trailing slash so `import.meta.env.BASE_URL` is consistent.
const rawBase = process.env.BASE_PATH || "/";
const base = `/${rawBase.replace(/^\/|\/$/g, "")}/`.replace(/\/{2,}/g, "/");

// https://astro.build/config
export default defineConfig({
  site: "https://rell2405.github.io/birthday-party-site",
  base,

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
