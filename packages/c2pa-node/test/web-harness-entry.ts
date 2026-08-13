import { createC2pa } from "@contentauth/c2pa-web/inline";

type VerifyFn = (b64: string, mime: string) => Promise<unknown>;

const verify: VerifyFn = async (b64, mime) => {
  const bytes = Uint8Array.from(atob(b64), (character) => character.charCodeAt(0));
  const c2pa = await createC2pa();
  const blob = new Blob([bytes], { type: mime });
  const reader = await c2pa.reader.fromBlob(mime, blob);
  if (!reader) return null;
  try {
    return await reader.manifestStore();
  } finally {
    await reader.free();
    c2pa.dispose();
  }
};

(globalThis as unknown as { __c2paVerify: VerifyFn }).__c2paVerify = verify;
