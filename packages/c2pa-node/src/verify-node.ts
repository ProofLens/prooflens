import { Reader } from "@contentauth/c2pa-node";
import type { AssetMime } from "@prooflens/claim";
import { C2PA_OFFLINE_VERIFY_SETTINGS } from "./constants.js";
import { evaluateC2paEvidence } from "./evidence.js";
import type { C2paEvidence } from "./types.js";

function bufferFrom(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function verifyC2paWithNode(bytes: Uint8Array, mime: AssetMime): Promise<C2paEvidence> {
  try {
    const reader = await Reader.fromAsset(
      { buffer: bufferFrom(bytes), mimeType: mime },
      C2PA_OFFLINE_VERIFY_SETTINGS
    );
    if (reader === null) return evaluateC2paEvidence(undefined);
    return evaluateC2paEvidence(reader.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "C2PA Node verification failed";
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
  }
}
