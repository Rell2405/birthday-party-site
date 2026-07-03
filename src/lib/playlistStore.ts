import { api, apiEnabled } from "./apiClient";
import type { Song, SongSearchResult, YouTubeRef } from "./types";

const KEY = "party.playlist";

const seedSongs: Song[] = [
  {
    id: "seed-1",
    title: "September",
    artist: "Earth, Wind & Fire",
    addedBy: "The Host",
    votes: 3,
    createdAt: 0,
    youtube: {
      videoId: "Gs069dndIYk",
      channel: "Earth, Wind & Fire",
      thumbnail: "https://i.ytimg.com/vi/Gs069dndIYk/mqdefault.jpg",
    },
  },
  {
    id: "seed-2",
    title: "Dancing Queen",
    artist: "ABBA",
    addedBy: "The Host",
    votes: 2,
    createdAt: 1,
    youtube: {
      videoId: "xFrGuyw1V8s",
      channel: "ABBA",
      thumbnail: "https://i.ytimg.com/vi/xFrGuyw1V8s/mqdefault.jpg",
    },
  },
];

export interface SongInput {
  title: string;
  artist: string;
  addedBy: string;
  youtube?: YouTubeRef;
}

function readLocal(): Song[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Song[]) : seedSongs;
  } catch {
    return seedSongs;
  }
}

function writeLocal(items: Song[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const playlistStore = {
  shared: apiEnabled,
  canSearch: apiEnabled,

  async list(): Promise<Song[]> {
    if (apiEnabled) return api.get<Song[]>("/api/songs");
    return readLocal();
  },

  async add(input: SongInput): Promise<Song> {
    if (apiEnabled) return api.post<Song>("/api/songs", input);
    const local = readLocal();
    const dupe = local.some(
      (s) =>
        (input.youtube && s.youtube?.videoId === input.youtube.videoId) ||
        (s.title.toLowerCase() === input.title.toLowerCase() &&
          s.artist.toLowerCase() === input.artist.toLowerCase()),
    );
    if (dupe) throw new Error("That track is already on the list.");
    const song: Song = {
      id: crypto.randomUUID(),
      title: input.title,
      artist: input.artist,
      addedBy: input.addedBy || "Anonymous",
      votes: 1,
      createdAt: Date.now(),
      youtube: input.youtube,
    };
    writeLocal([song, ...local]);
    return song;
  },

  async vote(id: string, delta: 1 | -1): Promise<void> {
    if (apiEnabled) {
      await api.post(`/api/songs/${id}/vote`, { delta });
      return;
    }
    writeLocal(
      readLocal().map((s) =>
        s.id === id ? { ...s, votes: Math.max(0, s.votes + delta) } : s,
      ),
    );
  },

  async remove(id: string): Promise<void> {
    if (apiEnabled) {
      await api.del(`/api/songs/${id}`);
      return;
    }
    writeLocal(readLocal().filter((s) => s.id !== id));
  },

  async search(q: string): Promise<SongSearchResult[]> {
    if (!apiEnabled) return [];
    return api.get<SongSearchResult[]>(`/api/song-search?q=${encodeURIComponent(q)}`);
  },
};
