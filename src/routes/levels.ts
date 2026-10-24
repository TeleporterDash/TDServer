/**
 * Level routes.
 *
 * GET  /levels        - list all level metadata
 * GET  /level/:id     - full level data
 * POST /level         - submit a new level
 */

import type { LevelData, LevelSummary, LevelSubmission } from "../types";
import { validateLevel } from "../validate";

export interface RouteContext {
  request: Request;
  env: {
    LEVELS: KVNamespace;
    [key: string]: unknown;
  };
  params: Record<string, string>;
  origin: string;
}

export async function handleListLevels(ctx: RouteContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const keys = await ctx.env.LEVELS.list({ prefix: "level:" });
  const summaries: LevelSummary[] = [];

  for (const key of keys.keys) {
    const raw = await ctx.env.LEVELS.get(key.name);
    if (!raw) continue;
    try {
      const level: LevelData = JSON.parse(raw);
      summaries.push({
        id: level.id,
        title: level.title,
        rating: level.rating || 0,
        commentCount: (level.comments || []).length,
        plays: level.plays || 0,
        author: level.author,
      });
    } catch {
      continue;
    }
  }

  summaries.sort((a, b) => b.id - a.id);

  return new Response(JSON.stringify(summaries), { headers });
}

export async function handleGetLevel(ctx: RouteContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const id = ctx.params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(
      JSON.stringify({ error: "Invalid level ID" }),
      { status: 400, headers }
    );
  }

  return ctx.env.LEVELS.get("level:" + id).then((raw) => {
    if (!raw) {
      return new Response("[]", { headers });
    }
    return new Response("[" + raw + "]", { headers });
  });
}

export async function handlePostLevel(ctx: RouteContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  let body: LevelSubmission;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const error = validateLevel(body);
  if (error) {
    return new Response(
      JSON.stringify({ success: false, error }),
      { status: 400, headers }
    );
  }

  // NOTE: This is not atomic — concurrent POSTs can read the same counter
  let newId = 1;
  const counterRaw = await ctx.env.LEVELS.get("next_level_id");
  if (counterRaw) {
    const parsed = parseInt(counterRaw, 10);
    if (!isNaN(parsed) && parsed >= 0) newId = parsed + 1;
  }
  await ctx.env.LEVELS.put("next_level_id", String(newId));

  const level: LevelData = {
    ...body,
    id: newId,
    rating: 0,
    ratings: [],
    comments: [],
    plays: 0,
    createdAt: new Date().toISOString(),
  };

  await ctx.env.LEVELS.put("level:" + newId, JSON.stringify(level));

  return new Response(
    JSON.stringify({ id: newId, success: true }),
    { status: 201, headers }
  );
}
