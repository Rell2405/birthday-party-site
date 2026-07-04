# Technology Requirements & Versions

This document lists the technologies, tools, and external services the Fourth of
July Bash website depends on, along with the versions in use.

- **Repository:** `Rell2405/birthday-party-site`
- **Live site:** https://rell2405.github.io/birthday-party-site/
- **Last updated:** 2026-07-04

Two independently deployed pieces make up the project:

1. **Static site** — an Astro + React + Tailwind front end, built to static
   files and hosted on **GitHub Pages**.
2. **API Worker** — an optional Cloudflare Worker backend that persists RSVPs
   and playlist entries and proxies YouTube search. When it is not configured,
   the site automatically falls back to a browser-only "demo mode"
   (`localStorage`).

---

## Local development requirements

| Requirement | Version | Notes |
| --- | --- | --- |
| **Node.js** | `>= 22.12.0` | Enforced via `engines.node` in `package.json`. Development/CI uses **Node 22**. |
| **npm** | `>= 10` | Ships with Node 22 (developed against npm 10.9.2). |
| **Git** | any recent | Source control + triggers the Pages deploy on push to `main`. |
| **Wrangler** *(API only)* | `^4.107.0` | Cloudflare CLI; only needed to run/deploy the Worker. |

---

## Front-end stack (site)

Defined in the root [`package.json`](./package.json). The **Range** column is the
declared semver range; the **Locked** column is the exact version currently
resolved in `package-lock.json`.

### Runtime dependencies

| Package | Range | Locked | Purpose |
| --- | --- | --- | --- |
| `astro` | `^7.0.6` | `7.0.6` | Static-site framework / build tool. |
| `react` | `^19.2.7` | `19.2.7` | Interactive UI islands. |
| `react-dom` | `^19.2.7` | `19.2.7` | React DOM renderer / hydration. |
| `@astrojs/react` | `^6.0.1` | `6.0.1` | Astro integration for React islands. |
| `tailwindcss` | `^4.3.2` | `4.3.2` | Utility-first CSS (Tailwind v4). |
| `@tailwindcss/vite` | `^4.3.2` | `4.3.2` | Tailwind v4 Vite plugin (no `tailwind.config.js`; theme is defined in `src/styles/global.css`). |
| `@types/react` | `^19.2.17` | `19.2.17` | React type definitions. |
| `@types/react-dom` | `^19.2.3` | `19.2.3` | React DOM type definitions. |

### Dev / tooling dependencies

| Package | Range | Locked | Purpose |
| --- | --- | --- | --- |
| `typescript` | `^6.0.3` | `6.0.3` | Type checking for `.ts`/`.tsx`/`.astro`. |
| `@astrojs/check` | `^0.9.9` | `0.9.9` | `astro check` diagnostics. |
| `@playwright/test` | `^1.61.1` | `1.61.1` | End-to-end + security tests (Chromium). |
| `@types/node` | `^26.1.0` | `26.1.0` | Node type definitions. |

### Transitive tooling of note

| Tool | Version | Notes |
| --- | --- | --- |
| **Vite** | `8.1.3` | Bundler/dev server used by Astro (pulled in transitively). |
| **Playwright Chromium** | bundled with `@playwright/test 1.61.1` | Browser used for the test suite. |

---

## Backend stack (Cloudflare Worker API)

Defined in [`worker/package.json`](./worker/package.json) and
[`worker/wrangler.toml`](./worker/wrangler.toml).

| Package / setting | Value | Purpose |
| --- | --- | --- |
| **Runtime** | Cloudflare Workers (V8 isolates) | Serverless API host. |
| `wrangler` | `^4.107.0` | Build/dev/deploy CLI for the Worker. |
| `@cloudflare/workers-types` | `^4.20241106.0` | Workers type definitions. |
| `typescript` | `^5.6.3` | Type checking for the Worker (`tsc --noEmit`). |
| `compatibility_date` | `2024-11-01` | Cloudflare runtime compatibility date. |
| `DATA_REPO` | `Rell2405/birthday-party-data` | Private repo used as a JSON datastore. |
| `DATA_BRANCH` | `main` | Branch the Worker commits data to. |
| `ALLOWED_ORIGIN` | `https://rell2405.github.io,http://localhost:4321` | CORS allowlist (comma-separated). |

**Worker secrets** (set with `wrangler secret put`, never committed):

- `GITHUB_TOKEN` — fine-grained PAT with Contents read/write on the data repo.
- `YOUTUBE_API_KEY` — key for the YouTube Data API v3.

---

## External services & APIs

| Service | Used for | Auth |
| --- | --- | --- |
| **GitHub Pages** | Hosting the static site. | GitHub Actions OIDC (`id-token`). |
| **GitHub Contents API** | Storing `rsvps.json` / `playlist.json` in a private repo. | `GITHUB_TOKEN` secret (Worker). |
| **YouTube Data API v3** | Song search + video IDs for the playlist player. | `YOUTUBE_API_KEY` secret (Worker). |
| **Cloudflare Workers** | Hosting the API backend. | Cloudflare account (Wrangler). |
| **Google Fonts** | `Fraunces` + `Inter` web fonts. | None (public CDN). |

---

## Deployment & CI

Site deploys automatically via GitHub Actions on every push to `main`
([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)).

| Component | Version |
| --- | --- |
| Runner | `ubuntu-latest` |
| `actions/checkout` | `v4` |
| `actions/configure-pages` | `v5` |
| `actions/setup-node` | `v4` (Node `22`, npm cache) |
| `actions/upload-pages-artifact` | `v3` |
| `actions/deploy-pages` | `v4` |

Build-time environment variables:

- `BASE_PATH` — injected from Pages so the site builds under
  `/birthday-party-site/` (local dev stays at `/`).
- `PUBLIC_API_BASE` — Actions **variable** pointing at the deployed Worker URL.
  When unset, the site builds in demo mode.

The Worker is deployed separately with `wrangler deploy` from the `worker/`
directory.

---

## Browser support & progressive enhancement

- Targets modern evergreen browsers (Chrome, Edge, Firefox, Safari).
- Core content (event details, schedule, FAQ) is static HTML and works without
  JavaScript. Interactive islands (countdown, RSVP form, playlist, and the
  decorative fireworks / grill / sparkler-cursor motion graphics) are hydrated
  progressively with Astro's `client:*` directives.
- All motion graphics honour the `prefers-reduced-motion` user setting.

---

## Quick reference — key commands

```bash
# Site (run from repo root)
npm install            # install dependencies
npm run dev            # local dev server (http://localhost:4321)
npm run build          # production build -> dist/
npm run preview        # serve the production build locally
npm test               # Playwright e2e + security suite

# Worker (run from ./worker)
npm install
npm run dev            # local Worker (wrangler dev)
npm run deploy         # deploy to Cloudflare
```
