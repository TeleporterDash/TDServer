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
import { getAllowedOrigin, applyCorsHeaders, corsPreflightResponse, isOriginAllowed } from "./middleware/cors";
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
    const requestOrigin = request.headers.get("Origin") || "";
    const clientIp = getClientIp(request);

    if (request.method === "OPTIONS") {
      return corsPreflightResponse(origin, requestOrigin);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        levels: "connected",
        music: "connected",
        audio: "connected",
      };
      const resp = new Response(JSON.stringify(health), {
        headers: { "Content-Type": "application/json" },
      });
      return applyCorsHeaders(resp, origin, requestOrigin);
    }


    if (url.pathname === "/levels" && request.method === "GET") {
      const resp = await handleListLevels({ request, env, params: {}, origin });
      return applyCorsHeaders(resp, origin, requestOrigin);
    }

    const levelMatch = url.pathname.match(/^\/level\/(\d+)(?:\/(rating|comment))?$/);
    if (levelMatch) {
      const id = levelMatch[1];
      const action = levelMatch[2];

      if (!action) {
        if (request.method === "GET") {
          const resp = await handleGetLevel({ request, env, params: { id }, origin });
          return applyCorsHeaders(resp, origin, requestOrigin);
        }
      }

      if (action === "rating" && request.method === "POST") {
        if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }
        const resp = await handleRating({ request, env, params: { id }, origin });
        return applyCorsHeaders(resp, origin, requestOrigin);
      }

      if (action === "comment" && request.method === "POST") {
        if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }
        const resp = await handleComment({ request, env, params: { id }, origin });
        return applyCorsHeaders(resp, origin, requestOrigin);
      }
    }

    if (url.pathname === "/level" && request.method === "POST") {
      if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
      const resp = await handlePostLevel({ request, env, params: {}, origin });
      return applyCorsHeaders(resp, origin, requestOrigin);
    }


    if (url.pathname === "/music" && request.method === "GET") {
      const resp = await handleListMusic({ request, env, params: {}, origin });
      return applyCorsHeaders(resp, origin, requestOrigin);
    }

    if (url.pathname === "/music" && request.method === "POST") {
      if (!checkRateLimit(clientIp, WRITE_RATE_LIMIT)) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
      const resp = await handlePostMusic({ request, env, params: {}, origin });
      return applyCorsHeaders(resp, origin, requestOrigin);
    }

    const musicMatch = url.pathname.match(/^\/music\/(\d+)$/);
    if (musicMatch) {
      const id = musicMatch[1];

      if (request.method === "GET") {
        const resp = await handleGetMusic({ request, env, params: { id }, origin });
        return applyCorsHeaders(resp, origin, requestOrigin);
      }

      if (request.method === "DELETE") {
        const resp = await handleDeleteMusic({ request, env, params: { id }, origin });
        return applyCorsHeaders(resp, origin, requestOrigin);
      }
    }

    // 404 for everything else
    const resp = new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
    return applyCorsHeaders(resp, origin, requestOrigin);
  },
};