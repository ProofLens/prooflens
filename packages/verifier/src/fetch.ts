import type { FetchFailure, FetchSuccess, RegistryLookupResult } from "./types.js";

export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

function isOnline(online?: boolean): boolean {
  if (online !== undefined) return online;
  return typeof navigator === "undefined" || navigator.onLine;
}

function failure(kind: FetchFailure["kind"], reason: string): FetchFailure {
  return { ok: false, kind, reason };
}

export async function fetchResource(
  url: string,
  options: { fetchImpl?: FetchImpl; online?: boolean; purpose: "asset" | "registry" }
): Promise<FetchSuccess<Uint8Array> | FetchFailure> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const online = isOnline(options.online);
  try {
    const response = await fetchImpl(url, {
      mode: "cors",
      credentials: "omit",
      cache: online ? "reload" : "force-cache"
    });
    if (!response.ok) {
      if (options.purpose === "registry") {
        return failure("unavailable", `Registry lookup failed with HTTP ${response.status}`);
      }
      return failure("http", `Asset fetch failed with HTTP ${response.status}`);
    }
    return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    if (!online) return failure("offline", "The browser is offline and the resource is not cached");
    if (options.purpose === "registry") return failure("unavailable", `Registry is unavailable: ${message}`);
    if (/failed to fetch|cors|networkerror|load failed/iu.test(message)) {
      return failure("cors", "Image bytes could not be read because of CORS or a network error");
    }
    return failure("cors", `Image bytes could not be read: ${message}`);
  }
}

export async function fetchJsonResource(
  url: string,
  options: { fetchImpl?: FetchImpl; online?: boolean; purpose: "asset" | "registry" }
): Promise<FetchSuccess<unknown> | FetchFailure> {
  const result = await fetchResource(url, options);
  if (!result.ok) return result;
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(result.value)) as unknown };
  } catch (error) {
    return failure("http", error instanceof Error ? error.message : "Response was not JSON");
  }
}

export async function lookupRegistryByKid(
  kid: string,
  options: { fetchImpl?: FetchImpl; online?: boolean } = {}
): Promise<RegistryLookupResult> {
  const result = await fetchJsonResource(kid, { ...options, purpose: "registry" });
  if (!result.ok) {
    return {
      status: "unavailable",
      reason: result.kind === "offline"
        ? "Registry is unavailable because the client is offline"
        : result.reason
    };
  }
  return { status: "ok", record: result.value };
}
