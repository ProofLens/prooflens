const SERVICE = "prooflens-registry";
const IDENTITY_CACHE = "no-cache";
const MANIFEST_CACHE = "public, max-age=31536000, immutable";
const NO_STORE = "no-store";
const MAX_KID_LENGTH = 2048;
const DIGEST = /^[0-9a-f]{64}$/u;

interface StoredJson {
  json: string;
}

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "ETag",
    "Vary": "Origin"
  });
}

function jsonResponse(value: unknown, status: number, cacheControl: string, request?: Request): Response {
  const headers = corsHeaders();
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", "application/json; charset=utf-8");
  const body = JSON.stringify(value);
  if (request?.method === "HEAD") return new Response(null, { status, headers });
  return new Response(body, { status, headers });
}

function ifNoneMatchHits(header: string | null, tag: string): boolean {
  if (header === null) return false;
  if (header.trim() === "*") return true;
  return header.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    const unweakened = trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
    return unweakened === tag;
  });
}

async function entityResponse(value: unknown, cacheControl: string, request: Request): Promise<Response> {
  const body = JSON.stringify(value);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const tag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  const headers = corsHeaders();
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("ETag", tag);
  if (ifNoneMatchHits(request.headers.get("If-None-Match"), tag)) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

function errorResponse(status: number, code: string, message: string, request?: Request): Response {
  return jsonResponse({ error: { code, message } }, status, NO_STORE, request);
}

function parseKid(url: URL): string | Response {
  const kid = url.searchParams.get("kid");
  if (kid === null || kid.length === 0 || kid.length > MAX_KID_LENGTH) {
    return errorResponse(400, "invalid_kid", "kid must be between 1 and 2048 characters");
  }
  try {
    const parsed = new URL(kid);
    if (parsed.protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    return errorResponse(400, "invalid_kid", "kid must be an absolute HTTPS URL");
  }
  return kid;
}

async function identity(request: Request, env: Env, url: URL): Promise<Response> {
  const kid = parseKid(url);
  if (kid instanceof Response) return kid;
  const row = await env.DB.prepare("SELECT record_json AS json FROM identity_records WHERE kid = ?1").bind(kid).first<StoredJson>();
  if (row === null) return errorResponse(404, "identity_not_found", "No identity record exists for this kid", request);
  return entityResponse(JSON.parse(row.json) as unknown, IDENTITY_CACHE, request);
}

async function revocation(request: Request, env: Env, url: URL): Promise<Response> {
  const kid = parseKid(url);
  if (kid instanceof Response) return kid;
  const row = await env.DB.prepare("SELECT record_json AS json FROM identity_records WHERE kid = ?1").bind(kid).first<StoredJson>();
  if (row === null) return errorResponse(404, "identity_not_found", "No identity record exists for this kid", request);
  const record = JSON.parse(row.json) as { status?: unknown; revocation?: unknown };
  return entityResponse({ kid, status: record.status, revocation: record.revocation }, IDENTITY_CACHE, request);
}

async function manifest(request: Request, env: Env, digest: string): Promise<Response> {
  if (!DIGEST.test(digest)) return errorResponse(400, "invalid_digest", "Manifest digest must be 64 lowercase hexadecimal characters", request);
  const row = await env.DB.prepare("SELECT envelope_json AS json FROM manifests WHERE digest = ?1").bind(digest).first<StoredJson>();
  if (row === null) return errorResponse(404, "manifest_not_found", "No manifest exists for this digest", request);
  return entityResponse(JSON.parse(row.json) as unknown, MANIFEST_CACHE, request);
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = errorResponse(405, "method_not_allowed", "Only GET, HEAD, and OPTIONS are supported", request);
    response.headers.set("Allow", "GET, HEAD, OPTIONS");
    return response;
  }

  const url = new URL(request.url);
  if (url.pathname === "/api/health") {
    return jsonResponse({
      ok: true,
      service: SERVICE,
      environment: env.ENVIRONMENT,
      version: env.CF_VERSION_METADATA.id
    }, 200, NO_STORE, request);
  }
  if (url.pathname === "/api/v1/identities") return identity(request, env, url);
  if (url.pathname === "/api/v1/revocations") return revocation(request, env, url);
  if (url.pathname.startsWith("/api/v1/manifests/")) {
    return manifest(request, env, url.pathname.slice("/api/v1/manifests/".length));
  }
  return errorResponse(404, "not_found", "Unknown API route", request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (caught: unknown) {
      console.error(JSON.stringify({
        event: "request_failed",
        environment: env.ENVIRONMENT,
        method: request.method,
        path: new URL(request.url).pathname,
        message: caught instanceof Error ? caught.message : "Unknown error"
      }));
      return errorResponse(503, "registry_unavailable", "Registry storage is unavailable", request);
    }
  }
} satisfies ExportedHandler<Env>;
