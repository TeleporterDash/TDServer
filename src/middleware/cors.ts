
const DEFAULT_ALLOWED_ORIGIN = "https://teleporterdash.github.io";
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

export function getAllowedOrigin(env: { ALLOWED_ORIGIN?: string }): string {
  // Explicit env override takes precedence
  if (env.ALLOWED_ORIGIN) return env.ALLOWED_ORIGIN;
  return DEFAULT_ALLOWED_ORIGIN;
}

export function isOriginAllowed(
  requestOrigin: string,
  allowedOrigin: string
): boolean {
  if (allowedOrigin === "*") return true;
  if (requestOrigin === allowedOrigin) return true;
  // Allow local dev origins
  if (DEV_ORIGINS.includes(requestOrigin)) return true;
  return false;
}

export function applyCorsHeaders(
  response: Response,
  origin: string,
  requestOrigin: string,
  methods: string = "GET, POST, PUT, DELETE, OPTIONS"
): Response {
  const headers = new Headers(response.headers);
  if (isOriginAllowed(requestOrigin, origin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
  } else {
    headers.set("Access-Control-Allow-Origin", origin);
  }
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

export function corsPreflightResponse(
  origin: string,
  requestOrigin: string
): Response {
  const allowed = isOriginAllowed(requestOrigin, origin);
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowed ? (requestOrigin || origin) : origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}