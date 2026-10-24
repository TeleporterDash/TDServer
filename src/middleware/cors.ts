
const DEFAULT_ALLOWED_ORIGIN = "https://teleporterdash.github.io";

export function getAllowedOrigin(env: { ALLOWED_ORIGIN?: string }): string {
  return env.ALLOWED_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN;
}

export function applyCorsHeaders(
  response: Response,
  origin: string,
  methods: string = "GET, POST, PUT, DELETE, OPTIONS"
): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", methods);
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export function corsPreflightResponse(origin: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}