/** A single comment on a level. */
export interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

/** A single user rating for a level. */
export interface RatingEntry {
  user: string;
  score: number; // 1-5
}

/** A song in the music catalog. */
export interface MusicEntry {
  id: string;
  title: string;
  artist: string;
  source: "repo" | "r2";
  path?: string; // for repo songs: relative path in game repo
  url?: string; // for r2 songs: full URL
  duration?: number;
  uploadedAt?: string;
}

/** Full level data as stored in KV. */
export interface LevelData {
  id: number;
  title: string;
  description?: string;
  matrix: unknown[][];
  colorRow: unknown[];
  author: string;
  music?: string;
  rating: number;
  ratings: RatingEntry[];
  comments: Comment[];
  createdAt: string;
  plays: number;
}

/** Subset of LevelData returned in list views. */
export interface LevelSummary {
  id: number;
  title: string;
  rating: number;
  commentCount: number;
  plays: number;
  author: string;
}

/** Request body for POST /level. */
export interface LevelSubmission {
  title: string;
  description?: string;
  matrix: unknown[][];
  colorRow: unknown[];
  author: string;
  music?: string;
}

/** Request body for POST /level/:id/rating. */
export interface RatingSubmission {
  user: string;
  score: number;
}

/** Request body for POST /level/:id/comment. */
export interface CommentSubmission {
  author?: string;
  text: string;
}

/** Request body for POST /music. */
export interface MusicSubmission {
  title: string;
  artist: string;
  file: ArrayBuffer | Blob;
  filename: string;
  contentType: string;
}