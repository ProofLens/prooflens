import { useCallback, useState } from "react";
import {
  createBrowserCreatorKey,
  restoreBrowserCreatorKey,
  signClaim,
  type CreatorKeyBackup,
  type RegistryPublicJwk
} from "@prooflens/identity";
import type { ProofLensClaim, ProofLensEnvelope } from "@prooflens/claim";

export interface CreatorIdentityState {
  status: "empty" | "ready" | "error";
  publicJwk?: RegistryPublicJwk;
  backup?: CreatorKeyBackup;
  error?: string;
}

export function useCreatorIdentity(): {
  state: CreatorIdentityState;
  create: (passphrase: string) => Promise<void>;
  restore: (backup: CreatorKeyBackup, passphrase: string) => Promise<void>;
  sign: (claim: ProofLensClaim) => Promise<ProofLensEnvelope>;
} {
  const [keyPair, setKeyPair] = useState<CryptoKeyPair>();
  const [state, setState] = useState<CreatorIdentityState>({ status: "empty" });

  const create = useCallback(async (passphrase: string) => {
    try {
      const created = await createBrowserCreatorKey(passphrase);
      setKeyPair(created.keyPair);
      setState({ status: "ready", publicJwk: created.publicJwk, backup: created.backup });
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error.message : "Creator key creation failed" });
    }
  }, []);

  const restore = useCallback(async (backup: CreatorKeyBackup, passphrase: string) => {
    try {
      const restored = await restoreBrowserCreatorKey(backup, passphrase);
      setKeyPair(restored.keyPair);
      setState({ status: "ready", publicJwk: restored.publicJwk, backup });
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error.message : "Creator key restore failed" });
    }
  }, []);

  const sign = useCallback(async (claim: ProofLensClaim) => {
    if (keyPair === undefined) throw new Error("Create or restore a ProofLens creator identity key first");
    return signClaim(claim, keyPair.privateKey);
  }, [keyPair]);

  return { state, create, restore, sign };
}
