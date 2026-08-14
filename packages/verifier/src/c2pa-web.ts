import { C2PA_OFFLINE_VERIFY_SETTINGS } from "@prooflens/c2pa-node/constants";
import { evaluateC2paEvidence } from "@prooflens/c2pa-node/evidence";
import type { C2paEvidence } from "@prooflens/c2pa-node/types";
import type { AssetMime } from "@prooflens/claim";

function bytesCopy(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function failedEvidence(message: string): C2paEvidence {
  if (/no claim|not found|no JUMBF|no c2pa/iu.test(message)) return evaluateC2paEvidence(undefined);
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

function timeoutEvidence(): C2paEvidence {
  return {
    present: false,
    signatureValid: false,
    ecosystemTrust: "untrusted",
    developmentCredential: false,
    state: "absent",
    reasons: ["C2PA web verification timed out"],
    validationStatus: []
  };
}

async function verifyC2paInBrowserUnbound(bytes: Uint8Array, mime: AssetMime): Promise<C2paEvidence> {
  try {
    const { createC2pa } = await import("@contentauth/c2pa-web/inline");
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
      return failedEvidence(error instanceof Error ? error.message : "C2PA web verification failed");
    } finally {
      c2pa.dispose();
    }
  } catch (error) {
    return failedEvidence(error instanceof Error ? error.message : "C2PA web verification failed");
  }
}

export async function verifyC2paInBrowser(bytes: Uint8Array, mime: AssetMime): Promise<C2paEvidence> {
  return Promise.race([
    verifyC2paInBrowserUnbound(bytes, mime),
    new Promise<C2paEvidence>((resolve) => {
      setTimeout(() => resolve(timeoutEvidence()), 4000);
    })
  ]);
}
