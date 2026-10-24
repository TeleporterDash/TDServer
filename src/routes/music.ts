/**
 * Music routes.
 *
 * GET    /music       - full music catalog (repo songs + R2 songs)
 * GET    /music/:id   - single song metadata + URL
 * POST   /music       - upload a user song (stored in R2)
 * DELETE /music/:id   - remove a user song
 *
 * Audio files are stored in Cloudflare R2 (TELEPORTER_AUDIO bucket).
 * Metadata is stored in KV (TELEPORTER_MUSIC namespace).
 *
 * Existing level songs live in the game repo and are served statically.
 * User-uploaded songs live in R2.
 */

import type { MusicEntry, MusicSubmission } from "../types";
import { validateMusicSubmission } from "../validate";

export interface MusicContext {
  request: Request;
  env: {
    MUSIC: KVNamespace;
    AUDIO: R2Bucket;
    [key: string]: unknown;
  };
  params: Record<string, string>;
  origin: string;
}

const REPO_SONGS: MusicEntry[] = [
  { id: "level1", title: "Level 1", artist: "TeleporterDash", source: "repo", path: "./Sound/Level Soundtracks/level1.ogg" },
  { id: "level2", title: "Level 2", artist: "TeleporterDash", source: "repo", path: "./Sound/Level Soundtracks/level2.ogg" },
  { id: "level3", title: "Level 3", artist: "TeleporterDash", source: "repo", path: "./Sound/Level Soundtracks/level3.ogg" },
  { id: "level4", title: "Level 4", artist: "TeleporterDash", source: "repo", path: "./Sound/Level Soundtracks/level4.ogg" },
  { id: "level5", title: "Level 5", artist: "TeleporterDash", source: "repo", path: "./Sound/Level Soundtracks/level5.ogg" },
];

export async function handleListMusic(ctx: MusicContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  return ctx.env.MUSIC.list({ prefix: "music:" }).then(async (keys) => {
    const userSongs: MusicEntry[] = [];

    for (const key of keys.keys) {
      const raw = await ctx.env.MUSIC.get(key.name);
      if (!raw) continue;
      try {
        userSongs.push(JSON.parse(raw));
      } catch {
        continue;
      }
    }

    const catalog = [...REPO_SONGS, ...userSongs];
    return new Response(JSON.stringify(catalog), { headers });
  });
}

export async function handleGetMusic(ctx: MusicContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const id = ctx.params.id;
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Music ID required" }),
      { status: 400, headers }
    );
  }

  const repoSong = REPO_SONGS.find((s) => s.id === id);
  if (repoSong) {
    return new Response(JSON.stringify(repoSong), { headers });
  }

  return ctx.env.MUSIC.get(`music:${id}`).then((raw) => {
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "Song not found" }),
        { status: 404, headers }
      );
    }
    return new Response(raw, { headers });
  });
}

export async function handlePostMusic(ctx: MusicContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  let body: MusicSubmission;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const error = validateMusicSubmission(body);
  if (error) {
    return new Response(
      JSON.stringify({ success: false, error }),
      { status: 400, headers }
    );
  }

  const allowedTypes = ["audio/ogg", "audio/mpeg", "audio/mp3", "audio/wav"];
  if (!allowedTypes.includes(body.contentType)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Audio must be OGG or MP3",
      }),
      { status: 400, headers }
    );
  }

  const keys = await ctx.env.MUSIC.list({ prefix: "music:" });
  const existingIds = keys.keys
    .map((k) => {
      const parts = k.name.split(":");
      return parseInt(parts[parts.length - 1]) || 0;
    })
    .filter((n) => n > 0);
  const newId = Math.max(...existingIds, 0) + 1;

  const r2Key = `songs/${newId}.${body.contentType.includes("ogg") ? "ogg" : "mp3"}`;
  await ctx.env.AUDIO.put(r2Key, body.file, {
    httpMetadata: { contentType: body.contentType },
  });

  const entry: MusicEntry = {
    id: String(newId),
    title: body.title,
    artist: body.artist,
    source: "r2",
    url: `https://teleporterdash-audio.r2.dev/${r2Key}`,
    uploadedAt: new Date().toISOString(),
  };

  await ctx.env.MUSIC.put(`music:${newId}`, JSON.stringify(entry));

  return new Response(
    JSON.stringify({ success: true, id: newId, entry }),
    { status: 201, headers }
  );
}

export async function handleDeleteMusic(ctx: MusicContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const id = ctx.params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid music ID" }),
      { status: 400, headers }
    );
  }

  const raw = await ctx.env.MUSIC.get(`music:${id}`);
  if (!raw) {
    return new Response(
      JSON.stringify({ success: false, error: "Song not found" }),
      { status: 404, headers }
    );
  }

  const entry: MusicEntry = JSON.parse(raw);
  if (entry.url) {
    const r2Key = entry.url.split("teleporterdash-audio.r2.dev/")[1];
    if (r2Key) {
      await ctx.env.AUDIO.delete(r2Key);
    }
  }

  await ctx.env.MUSIC.delete(`music:${id}`);

  return new Response(
    JSON.stringify({ success: true }),
    { headers }
  );
}