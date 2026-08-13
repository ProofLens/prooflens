import { bytesToHex } from "./encoding.js";
import type { AssetMime, DetachedAssetBinding } from "./types.js";

export async function sha256(bytes: BufferSource): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

export async function createDetachedAssetBinding(
  bytes: BufferSource,
  filename: string,
  mime: AssetMime
): Promise<DetachedAssetBinding> {
  return {
    filename,
    mime,
    bytes: bytes.byteLength,
    sha256: await sha256(bytes)
  };
}

export async function verifyDetachedAssetBinding(
  bytes: BufferSource,
  binding: DetachedAssetBinding
): Promise<{ matches: boolean; digestMatches: boolean; sizeMatches: boolean }> {
  const digestMatches = (await sha256(bytes)) === binding.sha256;
  const sizeMatches = bytes.byteLength === binding.bytes;
  return { matches: digestMatches && sizeMatches, digestMatches, sizeMatches };
}
