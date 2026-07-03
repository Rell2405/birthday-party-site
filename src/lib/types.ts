export interface Rsvp {
  id: string;
  name: string;
  attending: "yes" | "no";
  guests: number;
  meal: string;
  note: string;
  createdAt: number;
}

export interface YouTubeRef {
  videoId: string;
  thumbnail: string;
  channel: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  votes: number;
  createdAt: number;
  youtube?: YouTubeRef;
}

export interface SongSearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}
