import { createC2pa } from "@contentauth/c2pa-web/inline";
import type { AssetMime } from "@prooflens/claim";
import { C2PA_OFFLINE_VERIFY_SETTINGS } from "./constants.js";
import { evaluateC2paEvidence } from "./evidence.js";
import type { C2paEvidence } from "./types.js";

function bytesCopy(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export async function verifyC2paWithWeb(bytes: Uint8Array, mime: AssetMime): Promise<C2paEvidence> {
  const c2pa = await createC2pa({ settings: C2PA_OFFLINE_VERIFY_SETTINGS });
  const blob = new Blob([bytesCopy(bytes)], { type: mime });
  try {
    const reader = await c2pa.reader.fromBlob(blob.type, blob);
    if (reader === null) return evaluateC2paEvidence(undefined);
    try {
      return evaluateC2paEvidence(await reader.manifestStore());
    } finally {
      await reader.free();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "C2PA web verification failed";
    if (/no claim|not found|no JUMBF|no c2pa/iu.test(message)) {
      return evaluateC2paEvidence(undefined);
    }
    return {
      present: true,
      signatureValid: false,
      ecosystemTrust: "untrusted",
      developmentCredential: false,
      state: "invalid",
      reasons: [message],
      validationStatus: []
    };
  } finally {
    c2pa.dispose();
  }
}
