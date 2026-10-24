/**
 * Level interaction routes.
 *
 * POST /level/:id/rating  - submit/update a rating
 * POST /level/:id/comment - add a comment
 */

import type { Comment, LevelData, RatingEntry, RatingSubmission, CommentSubmission } from "../types";
import { validateRating, validateComment } from "../validate";

export interface InteractionContext {
  request: Request;
  env: {
    LEVELS: KVNamespace;
    [key: string]: unknown;
  };
  params: Record<string, string>;
  origin: string;
}

export async function handleRating(ctx: InteractionContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const id = ctx.params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid level ID" }),
      { status: 400, headers }
    );
  }

  let body: RatingSubmission;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const error = validateRating(body);
  if (error) {
    return new Response(
      JSON.stringify({ success: false, error }),
      { status: 400, headers }
    );
  }

  const raw = await ctx.env.LEVELS.get(`level:${id}`);
  if (!raw) {
    return new Response(
      JSON.stringify({ success: false, error: "Level not found" }),
      { status: 404, headers }
    );
  }

  const level: LevelData = JSON.parse(raw);

  level.ratings = level.ratings.filter((r) => r.user !== body.user);
  level.ratings.push({ user: body.user, score: body.score });

  level.rating =
    level.ratings.reduce((sum, r) => sum + r.score, 0) / level.ratings.length;

  await ctx.env.LEVELS.put(`level:${id}`, JSON.stringify(level));

  return new Response(
    JSON.stringify({ success: true, rating: level.rating }),
    { headers }
  );
}

export async function handleComment(ctx: InteractionContext): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", ctx.origin);

  const id = ctx.params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid level ID" }),
      { status: 400, headers }
    );
  }

  let body: CommentSubmission;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const error = validateComment(body);
  if (error) {
    return new Response(
      JSON.stringify({ success: false, error }),
      { status: 400, headers }
    );
  }

  const raw = await ctx.env.LEVELS.get(`level:${id}`);
  if (!raw) {
    return new Response(
      JSON.stringify({ success: false, error: "Level not found" }),
      { status: 404, headers }
    );
  }

  const level: LevelData = JSON.parse(raw);

  const comment: Comment = {
    id: crypto.randomUUID(),
    author: body.author || "Anonymous",
    text: body.text,
    date: new Date().toISOString(),
  };

  level.comments.push(comment);
  await ctx.env.LEVELS.put(`level:${id}`, JSON.stringify(level));

  return new Response(
    JSON.stringify({ success: true, comment }),
    { status: 201, headers }
  );
}