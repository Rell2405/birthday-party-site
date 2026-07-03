import { api, apiEnabled } from "./apiClient";
import type { Rsvp } from "./types";

const KEY = "party.rsvps";

export interface RsvpInput {
  name: string;
  attending: "yes" | "no";
  guests: number;
  meal: string;
  note: string;
}

function readLocal(): Rsvp[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Rsvp[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: Rsvp[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const rsvpStore = {
  shared: apiEnabled,

  async list(): Promise<Rsvp[]> {
    if (apiEnabled) return api.get<Rsvp[]>("/api/rsvps");
    return readLocal();
  },

  async add(input: RsvpInput): Promise<Rsvp> {
    if (apiEnabled) return api.post<Rsvp>("/api/rsvps", input);
    const entry: Rsvp = {
      id: crypto.randomUUID(),
      name: input.name,
      attending: input.attending,
      guests: input.attending === "yes" ? input.guests : 0,
      meal: input.attending === "yes" ? input.meal : "",
      note: input.note,
      createdAt: Date.now(),
    };
    const next = [entry, ...readLocal()];
    writeLocal(next);
    return entry;
  },

  async remove(id: string): Promise<void> {
    if (apiEnabled) {
      await api.del(`/api/rsvps/${id}`);
      return;
    }
    writeLocal(readLocal().filter((r) => r.id !== id));
  },
};
