/**
 * TDServer — Cloudflare Worker entry point.
 *
 * Routes:
 *   GET    /levels                -> list level metadata
 *   GET    /level/:id             -> full level data
 *   POST   /level                 -> submit new level (rate-limited)
 *   POST   /level/:id/rating      -> submit/update rating
 *   POST   /level/:id/comment     -> add comment
 *   GET    /music                 -> music catalog
 *   GET    /music/:id             -> single song metadata
 *   POST   /music                 -> upload user song (rate-limited)
 *   DELETE /music/:id             -> remove user song
 *   GET    /health                -> health check
 *
 * Storage:
 *   KV  TELEPORTER_LEVELS  - level data (key: level:{id})
 *   KV  TELEPORTER_MUSIC   - music catalog metadata (key: music:{id})
 *   R2  TELEPORTER_AUDIO   - user-uploaded audio files
 */

import { handleListLevels, handleGetLevel, handlePostLevel } from "./routes/levels";
import { handleRating, handleComment } from "./routes/interactions";
import { handleListMusic, handleGetMusic, handlePostMusic, handleDeleteMusic } from "./routes/music";
import { getAllowedOrigin, corsPreflightResponse } from "./middleware/cors";
import { checkRateLimit, getClientIp } from "./middleware/rateLimit";

export interface Env {
  LEVELS: KVNamespace;
  MUSIC: KVNamespace;
  AUDIO: R2Bucket;
  ALLOWED_ORIGIN?: string;
  [key: string]: unknown;
}

const WRITE_RATE_LIMIT = { maxRequests: 1000, windowMs: 3_600_000 };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = getAllowedOrigin(env);
    const clientIp = getClientIp(request);

    if (request.method === "OPTIONS") {
      return corsPreflightResponse(origin);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        levels: "connected",
        music: "connected",
        audio: "connected",
      };
      return new Response(JSON.stringify(health), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
      });
    }


    if (url.pathname === "/levels" && request.method === "GET") {
      return handleListLevels({ request, env, params: {}, origin });
    }

    const levelMatch = url.pathname.match(/^\/level\/(\d+)(?:\/(rating|comment))?$/);
    if (levelMatch) {
      const id = levelMatch[1];
      const action = levelMatch[2];

      if (!action) {
        if (request.method === "GET") {
          return handleGetLevel({ request, env, params: { id }, origin });
        }
      }

      if (action === "rating" && request.method === "POST") {
        if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
            { status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } }
          );
        }
        return handleRating({ request, env, params: { id }, origin });
      }

      if (action === "comment" && request.method === "POST") {
        if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
            { status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } }
          );
        }
        return handleComment({ request, env, params: { id }, origin });
      }
    }

    if (url.pathname === "/level" && request.method === "POST") {
      if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } }
        );
      }
      return handlePostLevel({ request, env, params: {}, origin });
    }


    if (url.pathname === "/music" && request.method === "GET") {
      return handleListMusic({ request, env, params: {}, origin });
    }

    if (url.pathname === "/music" && request.method === "POST") {
      if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } }
        );
      }
      return handlePostMusic({ request, env, params: {}, origin });
    }

    const musicMatch = url.pathname.match(/^\/music\/(\d+)$/);
    if (musicMatch) {
      const id = musicMatch[1];

      if (request.method === "GET") {
        return handleGetMusic({ request, env, params: { id }, origin });
      }

      if (request.method === "DELETE") {
        return handleDeleteMusic({ request, env, params: { id }, origin });
      }
    }

    // 404 for everything else
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
      }
    );
  },
};