/**
 * Birthday Party API — Cloudflare Worker
 *
 * Holds the GitHub token + YouTube key server-side. Stores RSVPs and the
 * playlist as JSON files in a (private) GitHub repo via the Contents API, and
 * resolves free-text song names to playable YouTube videos.
 */

export interface Env {
  // Secrets (wrangler secret put ...)
  GITHUB_TOKEN: string;
  YOUTUBE_API_KEY: string;
  // Vars (wrangler.toml [vars])
  DATA_REPO: string; // "owner/repo"
  DATA_BRANCH: string; // e.g. "main"
  ALLOWED_ORIGIN: string; // e.g. "https://rell2405.github.io" or "*"
}

const RSVPS_PATH = "rsvps.json";
const PLAYLIST_PATH = "playlist.json";

/* ------------------------------- utilities -------------------------------- */

function json(data: unknown, status = 200, env?: Env, origin?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(env, origin),
    },
  });
}

function corsHeaders(env?: Env, origin?: string): Record<string, string> {
  const allowed = env?.ALLOWED_ORIGIN || "*";
  const allowOrigin =
    allowed === "*" ? "*" : origin && origin === allowed ? origin : allowed;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function b64encodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decodeUtf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function uuid(): string {
  return crypto.randomUUID();
}

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/* --------------------------- GitHub Contents API -------------------------- */

const GH_API = "https://api.github.com";

function ghHeaders(env: Env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: "application/vnd.github+json",
    "user-agent": "birthday-party-worker",
    "x-github-api-version": "2022-11-28",
  };
}

async function ghGetFile(
  env: Env,
  path: string,
): Promise<{ items: any[]; sha: string | null }> {
  const url = `${GH_API}/repos/${env.DATA_REPO}/contents/${path}?ref=${env.DATA_BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders(env) });
  if (res.status === 404) return { items: [], sha: null };
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { content: string; sha: string };
  const text = b64decodeUtf8(body.content);
  let items: any[] = [];
  try {
    items = JSON.parse(text);
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }
  return { items, sha: body.sha };
}

async function ghPutFile(
  env: Env,
  path: string,
  items: any[],
  message: string,
  sha: string | null,
): Promise<Response> {
  const url = `${GH_API}/repos/${env.DATA_REPO}/contents/${path}`;
  const payload: Record<string, unknown> = {
    message,
    content: b64encodeUtf8(JSON.stringify(items, null, 2) + "\n"),
    branch: env.DATA_BRANCH,
  };
  if (sha) payload.sha = sha;
  return fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(env), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Read-modify-write with optimistic concurrency. Retries when another write
 * lands first (GitHub returns 409/422 on a stale sha).
 */
async function updateCollection<T>(
  env: Env,
  path: string,
  message: string,
  mutate: (items: T[]) => T[],
): Promise<T[]> {
  let lastErr = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const { items, sha } = await ghGetFile(env, path);
    const next = mutate(items as T[]);
    const res = await ghPutFile(env, path, next, message, sha);
    if (res.ok) return next;
    if (res.status === 409 || res.status === 422) {
      lastErr = `${res.status}`;
      // brief backoff before retrying with a fresh sha
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      continue;
    }
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
  }
  throw new Error(`GitHub PUT ${path} kept conflicting (${lastErr})`);
}

/* -------------------------------- YouTube --------------------------------- */

async function youtubeSearch(env: Env, q: string) {
  const cache = caches.default;
  const cacheKey = new Request(
    `https://cache.local/yt?q=${encodeURIComponent(q.toLowerCase())}`,
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10"); // Music
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("q", q);
  url.searchParams.set("key", env.YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube search failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  const results = (data.items || [])
    .filter((it: any) => it.id?.videoId)
    .map((it: any) => ({
      videoId: it.id.videoId,
      title: it.snippet?.title ?? "",
      channel: it.snippet?.channelTitle ?? "",
      thumbnail: it.snippet?.thumbnails?.medium?.url ?? "",
    }));

  const out = new Response(JSON.stringify(results), {
    headers: { "content-type": "application/json", "cache-control": "max-age=86400" },
  });
  // Cache to conserve YouTube quota (search costs 100 units/call).
  await cache.put(cacheKey, out.clone());
  return results;
}

/* -------------------------------- handlers -------------------------------- */

interface Rsvp {
  id: string;
  name: string;
  attending: "yes" | "no";
  guests: number;
  meal: string;
  note: string;
  createdAt: number;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  votes: number;
  createdAt: number;
  youtube?: { videoId: string; thumbnail: string; channel: string };
}

async function handleRsvps(req: Request, env: Env, origin: string, id?: string) {
  if (req.method === "GET") {
    const { items } = await ghGetFile(env, RSVPS_PATH);
    return json(items, 200, env, origin);
  }
  if (req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as any;
    const name = clampStr(body.name, 60);
    const attending = body.attending === "no" ? "no" : "yes";
    if (!name) return json({ error: "Name is required." }, 400, env, origin);
    let guests = Number(body.guests) || 1;
    guests = attending === "yes" ? Math.min(10, Math.max(1, guests)) : 0;
    const entry: Rsvp = {
      id: uuid(),
      name,
      attending,
      guests,
      meal: attending === "yes" ? clampStr(body.meal, 40) : "",
      note: clampStr(body.note, 280),
      createdAt: Date.now(),
    };
    await updateCollection<Rsvp>(env, RSVPS_PATH, `RSVP: ${name}`, (items) => [
      entry,
      ...items,
    ]);
    return json(entry, 201, env, origin);
  }
  if (req.method === "DELETE" && id) {
    await updateCollection<Rsvp>(env, RSVPS_PATH, `Remove RSVP ${id}`, (items) =>
      items.filter((r) => r.id !== id),
    );
    return json({ ok: true }, 200, env, origin);
  }
  return json({ error: "Method not allowed" }, 405, env, origin);
}

async function handleSongs(
  req: Request,
  env: Env,
  origin: string,
  id?: string,
  action?: string,
) {
  if (req.method === "GET") {
    const { items } = await ghGetFile(env, PLAYLIST_PATH);
    return json(items, 200, env, origin);
  }
  if (req.method === "POST" && id && action === "vote") {
    const body = (await req.json().catch(() => ({}))) as any;
    const delta = body.delta === -1 ? -1 : 1;
    const updated = await updateCollection<Song>(
      env,
      PLAYLIST_PATH,
      `Vote ${id}`,
      (items) =>
        items.map((s) =>
          s.id === id ? { ...s, votes: Math.max(0, s.votes + delta) } : s,
        ),
    );
    return json(updated.find((s) => s.id === id) ?? null, 200, env, origin);
  }
  if (req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as any;
    const title = clampStr(body.title, 120);
    const artist = clampStr(body.artist, 120);
    if (!title || !artist) {
      return json({ error: "Title and artist are required." }, 400, env, origin);
    }
    const yt =
      body.youtube && typeof body.youtube.videoId === "string"
        ? {
            videoId: clampStr(body.youtube.videoId, 20),
            thumbnail: clampStr(body.youtube.thumbnail, 300),
            channel: clampStr(body.youtube.channel, 120),
          }
        : undefined;
    const song: Song = {
      id: uuid(),
      title,
      artist,
      addedBy: clampStr(body.addedBy, 60) || "Anonymous",
      votes: 1,
      createdAt: Date.now(),
      youtube: yt,
    };
    let duplicate = false;
    await updateCollection<Song>(
      env,
      PLAYLIST_PATH,
      `Add song: ${title}`,
      (items) => {
        duplicate = items.some(
          (s) =>
            (yt && s.youtube?.videoId === yt.videoId) ||
            (s.title.toLowerCase() === title.toLowerCase() &&
              s.artist.toLowerCase() === artist.toLowerCase()),
        );
        return duplicate ? items : [song, ...items];
      },
    );
    if (duplicate) {
      return json({ error: "That track is already on the list." }, 409, env, origin);
    }
    return json(song, 201, env, origin);
  }
  if (req.method === "DELETE" && id) {
    await updateCollection<Song>(env, PLAYLIST_PATH, `Remove song ${id}`, (items) =>
      items.filter((s) => s.id !== id),
    );
    return json({ ok: true }, 200, env, origin);
  }
  return json({ error: "Method not allowed" }, 405, env, origin);
}

/* --------------------------------- router --------------------------------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/"); // e.g. ["api","songs","ID","vote"]

    try {
      if (parts[0] !== "api") {
        return json({ error: "Not found" }, 404, env, origin);
      }

      // /api/health
      if (parts[1] === "health") return json({ ok: true }, 200, env, origin);

      // /api/song-search?q=
      if (parts[1] === "song-search") {
        const q = url.searchParams.get("q")?.trim() ?? "";
        if (q.length < 2) return json([], 200, env, origin);
        const results = await youtubeSearch(env, q);
        return json(results, 200, env, origin);
      }

      // /api/rsvps  ,  /api/rsvps/:id
      if (parts[1] === "rsvps") {
        return handleRsvps(req, env, origin, parts[2]);
      }

      // /api/songs , /api/songs/:id , /api/songs/:id/vote
      if (parts[1] === "songs") {
        return handleSongs(req, env, origin, parts[2], parts[3]);
      }

      return json({ error: "Not found" }, 404, env, origin);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "Server error" },
        500,
        env,
        origin,
      );
    }
  },
};
