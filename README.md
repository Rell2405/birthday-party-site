# 🎂 Birthday Party Website

A modern, responsive party invitation site with **RSVP** and a crowd-sourced,
**playable YouTube playlist** — built with [Astro](https://astro.build),
[React](https://react.dev) islands, and [Tailwind CSS v4](https://tailwindcss.com).

- **Frontend:** static site, deployed free to **GitHub Pages**.
- **Backend:** a tiny **Cloudflare Worker** (`worker/`) that holds secrets and
  stores data as JSON in a **private** GitHub repo.
- **Music:** type a song name → resolved to a real YouTube track → plays inline.

> **Demo mode:** if you don't deploy the Worker, the site still works — RSVPs and
> the playlist just save to the visitor's own browser (`localStorage`).

## Features

- ⚡️ Astro static output with selectively-hydrated React islands
- 🎨 Custom Tailwind v4 design system (plum + gold theme)
- ⏱️ Live countdown to the big day
- 📝 Accessible RSVP form with validation + live, shared guest summary
- 🎵 Search-to-add playlist with upvoting, sorting, de-duplication
- ▶️ Built-in **YouTube queue player** — full songs, no login, auto-advance
- ♿️ Keyboard-friendly, screen-reader labels, respects `prefers-reduced-motion`
- 🔐 Guest data kept in a **private** repo; the site repo stays public

## Architecture

```
Visitor ─▶ GitHub Pages (static site)
                │  fetch()
                ▼
        Cloudflare Worker  ── YouTube Data API (song search)
                │  GitHub Contents API (token held server-side)
                ▼
     private repo: Rell2405/birthday-party-data
        rsvps.json · playlist.json
```

## Customise your party

All event content lives in one file: [`src/data/party.ts`](src/data/party.ts).

## Local development

Requires **Node 22+**.

```bash
npm install
npm run dev        # http://localhost:4321  (demo mode)
```

To develop against the Worker, create `.env` from `.env.example` and set
`PUBLIC_API_BASE` to your Worker URL (or `http://localhost:8787` while running
`wrangler dev`).

Scripts: `npm run build`, `npm run preview`, `npx astro check`.

## Deploying the backend (Cloudflare Worker)

1. **Create a fine-grained GitHub token** (least privilege):
   Settings → Developer settings → Fine-grained tokens →
   - Repository access: **only** `Rell2405/birthday-party-data`
   - Permissions: **Contents → Read and write**
2. **Get a YouTube Data API v3 key** from the Google Cloud Console.
3. Deploy:
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN     # paste the fine-grained token
   npx wrangler secret put YOUTUBE_API_KEY  # paste the YouTube key
   npx wrangler deploy
   ```
   Wrangler prints the Worker URL, e.g. `https://birthday-party-api.<sub>.workers.dev`.
4. (Recommended) In `worker/wrangler.toml`, set `ALLOWED_ORIGIN` to your Pages
   origin (`https://rell2405.github.io`) and redeploy.

## Deploying the frontend (GitHub Pages)

1. Repo → **Settings → Pages → Source** → **GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables** →
   add a variable `PUBLIC_API_BASE` = your Worker URL.
3. Push to `main`. The workflow
   ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds with
   the correct base path and bakes in `PUBLIC_API_BASE`.

Live at: `https://rell2405.github.io/birthday-party-site/`

## Worker API

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/rsvps` | list RSVPs |
| POST   | `/api/rsvps` | add an RSVP |
| DELETE | `/api/rsvps/:id` | remove an RSVP |
| GET    | `/api/songs` | list playlist |
| POST   | `/api/songs` | add a song |
| POST   | `/api/songs/:id/vote` | `{delta:1\|-1}` |
| DELETE | `/api/songs/:id` | remove a song |
| GET    | `/api/song-search?q=` | resolve a name → YouTube results |

## Project structure

```
├─ src/
│  ├─ data/party.ts            # ← all event content
│  ├─ layouts/Layout.astro
│  ├─ components/              # static Astro sections
│  │  └─ react/                # RSVP, Playlist, Countdown, YouTubePlayer
│  ├─ lib/                     # apiClient + rsvp/playlist stores + types
│  ├─ pages/index.astro
│  └─ styles/global.css
├─ worker/                     # Cloudflare Worker API
│  ├─ src/index.ts
│  └─ wrangler.toml
└─ .github/workflows/deploy.yml
```
