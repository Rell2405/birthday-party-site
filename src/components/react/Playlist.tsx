import { useEffect, useMemo, useRef, useState } from "react";
import { playlistStore, type SongInput } from "../../lib/playlistStore";
import type { Song, SongSearchResult } from "../../lib/types";
import YouTubePlayer, { type QueueItem } from "./YouTubePlayer";

const VOTED_KEY = "party.playlist.voted";
type SortKey = "votes" | "newest";

function readVoted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export default function Playlist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("votes");
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    setVoted(readVoted());
    let active = true;
    playlistStore
      .list()
      .then((items) => active && setSongs(items))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...songs];
    copy.sort((a, b) =>
      sort === "votes"
        ? b.votes - a.votes || b.createdAt - a.createdAt
        : b.createdAt - a.createdAt,
    );
    return copy;
  }, [songs, sort]);

  const queue: QueueItem[] = useMemo(
    () =>
      sorted
        .filter((s) => s.youtube?.videoId)
        .map((s) => ({
          videoId: s.youtube!.videoId,
          title: s.title,
          artist: s.artist,
        })),
    [sorted],
  );

  function persistVoted(next: string[]) {
    setVoted(next);
    localStorage.setItem(VOTED_KEY, JSON.stringify(next));
  }

  async function handleAdd(input: SongInput) {
    setError(null);
    const song = await playlistStore.add(input);
    setSongs((prev) => [song, ...prev]);
    persistVoted([...readVoted(), song.id]);
  }

  async function toggleVote(id: string) {
    const hasVoted = voted.includes(id);
    const delta: 1 | -1 = hasVoted ? -1 : 1;
    setSongs((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, votes: Math.max(0, s.votes + delta) } : s,
      ),
    );
    persistVoted(hasVoted ? voted.filter((v) => v !== id) : [...voted, id]);
    try {
      await playlistStore.vote(id, delta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed.");
    }
  }

  async function removeSong(id: string) {
    const prev = songs;
    setSongs((s) => s.filter((x) => x.id !== id));
    try {
      await playlistStore.remove(id);
    } catch {
      setSongs(prev);
    }
  }

  return (
    <div>
      {queue.length > 0 && (
        <YouTubePlayer
          queue={queue}
          activeVideoId={activeVideoId}
          onActiveChange={setActiveVideoId}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 h-fit">
          <AddSong onAdd={handleAdd} />
          {error && (
            <p role="alert" className="mt-3 text-sm text-blush-300">
              {error}
            </p>
          )}
        </div>

        {/* List */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-plum-300" aria-live="polite">
              {songs.length} {songs.length === 1 ? "track" : "tracks"} queued
            </p>
            <div className="flex items-center gap-1 rounded-full border border-plum-700 bg-plum-900/60 p-1 text-xs">
              <SortButton active={sort === "votes"} onClick={() => setSort("votes")}>
                Top voted
              </SortButton>
              <SortButton active={sort === "newest"} onClick={() => setSort("newest")}>
                Newest
              </SortButton>
            </div>
          </div>

          {loading ? (
            <div className="rounded-4xl border border-plum-700/60 bg-plum-900/40 p-10 text-center text-plum-300">
              Loading the playlist…
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-plum-700 bg-plum-900/30 p-10 text-center text-plum-300">
              The playlist is empty. Add the first banger! 🔊
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {sorted.map((song, i) => {
                const hasVoted = voted.includes(song.id);
                const isActive = song.youtube?.videoId === activeVideoId;
                const displayName = song.title || song.artist || "this track";
                return (
                  <li
                    key={song.id}
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 pr-4 transition",
                      isActive
                        ? "border-gold-400/70 bg-gold-400/10"
                        : "border-plum-700/60 bg-plum-900/50 hover:border-plum-500/70",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className="hidden w-5 shrink-0 text-center font-display text-lg font-bold text-plum-400 sm:block"
                    >
                      {i + 1}
                    </span>

                    {song.youtube?.videoId ? (
                      <button
                        type="button"
                        onClick={() => setActiveVideoId(song.youtube!.videoId)}
                        aria-label={`Play ${displayName}`}
                        className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                      >
                        <img
                          src={song.youtube.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                          ▶
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-plum-800/60 text-lg"
                      >
                        🎵
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {song.title || song.artist || "Untitled"}
                      </p>
                      <p className="truncate text-sm text-plum-300">
                        {song.title && song.artist && (
                          <span>{song.artist} · </span>
                        )}
                        <span className="text-plum-400">{song.addedBy}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleVote(song.id)}
                      aria-pressed={hasVoted}
                      aria-label={`${hasVoted ? "Remove your upvote from" : "Upvote"} ${displayName}. Currently ${song.votes} votes.`}
                      className={[
                        "flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 text-sm font-semibold transition active:scale-95",
                        hasVoted
                          ? "border-gold-400 bg-gold-400/15 text-gold-300"
                          : "border-plum-700 bg-plum-950/40 text-plum-200 hover:border-gold-400/60",
                      ].join(" ")}
                    >
                      <span aria-hidden="true" className="leading-none">▲</span>
                      <span className="leading-tight tabular-nums">{song.votes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSong(song.id)}
                      aria-label={`Remove ${displayName} from the playlist`}
                      className="shrink-0 rounded-md p-1 text-plum-500 transition hover:text-blush-300"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Add song card ------------------------------ */

function AddSong({ onAdd }: { onAdd: (input: SongInput) => Promise<void> }) {
  const [addedBy, setAddedBy] = useState("");

  if (playlistStore.canSearch) {
    return <SearchAdd addedBy={addedBy} setAddedBy={setAddedBy} onAdd={onAdd} />;
  }
  return <ManualAdd addedBy={addedBy} setAddedBy={setAddedBy} onAdd={onAdd} />;
}

function SearchAdd({
  addedBy,
  setAddedBy,
  onAdd,
}: {
  addedBy: string;
  setAddedBy: (v: string) => void;
  onAdd: (input: SongInput) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await playlistStore.search(query.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  async function pick(r: SongSearchResult) {
    setAddingId(r.videoId);
    try {
      await onAdd({
        title: cleanTitle(r.title),
        artist: cleanChannel(r.channel),
        addedBy,
        youtube: { videoId: r.videoId, thumbnail: r.thumbnail, channel: r.channel },
      });
      setQuery("");
      setResults([]);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="rounded-4xl border border-plum-700/60 bg-plum-900/60 p-6 shadow-xl backdrop-blur sm:p-8">
      <h3 className="font-display text-xl font-semibold text-white">Add a track</h3>
      <p className="mt-1 text-sm text-plum-300">
        Search by song title, artist, or both — then tap a result to queue it.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="song-search" className="mb-1.5 block text-sm font-semibold text-plum-100">
            Search for a song
          </label>
          <input
            id="song-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. “Levitating” or “Dua Lipa”"
            aria-describedby="song-search-hint"
            className="w-full rounded-xl border border-plum-700 bg-plum-950/60 px-4 py-2.5 text-plum-50 placeholder:text-plum-400 transition focus:border-gold-400 focus:outline-none"
          />
          <p id="song-search-hint" className="mt-1.5 text-xs text-plum-400">
            Only know the song or only the artist? Just type what you know.
          </p>
        </div>

        <div>
          <label htmlFor="song-by" className="mb-1.5 block text-sm font-semibold text-plum-100">
            Your name <span className="font-normal text-plum-400">(optional)</span>
          </label>
          <input
            id="song-by"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="Anonymous"
            className="w-full rounded-xl border border-plum-700 bg-plum-950/60 px-4 py-2.5 text-plum-50 placeholder:text-plum-400 transition focus:border-gold-400 focus:outline-none"
          />
        </div>

        <div aria-live="polite" className="min-h-[1rem]">
          {searching && <p className="text-sm text-plum-400">Searching…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-plum-400">No matches — try different words.</p>
          )}
          <ul className="mt-1 flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.videoId}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  disabled={addingId === r.videoId}
                  className="flex w-full items-center gap-3 rounded-xl border border-plum-700 bg-plum-950/40 p-2 text-left transition hover:border-gold-400/60 disabled:opacity-60"
                >
                  <img
                    src={r.thumbnail}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {cleanTitle(r.title)}
                    </span>
                    <span className="block truncate text-xs text-plum-400">
                      {r.channel}
                    </span>
                  </span>
                  <span className="shrink-0 text-gold-400">
                    {addingId === r.videoId ? "…" : "＋"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ManualAdd({
  addedBy,
  setAddedBy,
  onAdd,
}: {
  addedBy: string;
  setAddedBy: (v: string) => void;
  onAdd: (input: SongInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() && !artist.trim()) {
      setErr("Enter a song title or an artist.");
      return;
    }
    setErr(null);
    try {
      await onAdd({ title: title.trim(), artist: artist.trim(), addedBy });
      setTitle("");
      setArtist("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add song.");
    }
  }

  const field =
    "w-full rounded-xl border border-plum-700 bg-plum-950/60 px-4 py-2.5 text-plum-50 placeholder:text-plum-400 transition focus:border-gold-400 focus:outline-none";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-4xl border border-plum-700/60 bg-plum-900/60 p-6 shadow-xl backdrop-blur sm:p-8"
    >
      <h3 className="font-display text-xl font-semibold text-white">Add a track</h3>
      <p className="mt-1 text-sm text-plum-300">
        Enter a song title, an artist, or both — whatever you know.
      </p>
      <div className="mt-5 grid gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Song title"
          aria-label="Song title"
          className={field}
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          aria-label="Artist"
          className={field}
        />
        <input
          value={addedBy}
          onChange={(e) => setAddedBy(e.target.value)}
          placeholder="Your name (optional)"
          aria-label="Your name"
          className={field}
        />
        {err && (
          <p role="alert" className="text-sm text-blush-300">
            {err}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-gold-500 active:scale-[0.98]"
        >
          <span aria-hidden="true">🎵</span> Add to playlist
        </button>
      </div>
    </form>
  );
}

/* --------------------------------- helpers -------------------------------- */

// Trim common noise from YouTube video titles for a cleaner playlist.
function cleanTitle(title: string): string {
  return title
    .replace(/\((?:official\s*)?(?:music\s*)?(?:lyric\s*)?video\)/gi, "")
    .replace(/\[(?:official\s*)?(?:music\s*)?(?:lyric\s*)?video\]/gi, "")
    .replace(/\bofficial\s+(?:music\s+)?video\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–]\s*$/, "")
    .trim()
    .slice(0, 120);
}

// Tidy YouTube channel names into something artist-like.
function cleanChannel(channel: string): string {
  return channel
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*Official$/i, "")
    .trim()
    .slice(0, 120);
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full px-3 py-1 font-medium transition",
        active ? "bg-gold-400 text-white" : "text-plum-300 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
