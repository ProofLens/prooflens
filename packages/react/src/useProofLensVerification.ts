import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  verifyFromImageElement,
  type C2paVerifyFn,
  type RegistryLookup,
  type VerificationReport
} from "@prooflens/verifier";

export interface UseProofLensVerificationInput {
  imgRef?: RefObject<HTMLImageElement | null>;
  image?: HTMLImageElement | null;
  enabled?: boolean;
  registryLookup?: RegistryLookup;
  verifyC2pa?: C2paVerifyFn;
  registryRecord?: unknown;
  detachedEnvelope?: unknown;
  legacyManifest?: unknown;
  now?: Date;
  online?: boolean;
}

export interface ProofLensVerificationView {
  status: "idle" | "loading" | "ready" | "error";
  report?: VerificationReport;
  error?: string;
  refresh: () => void;
}

export function useProofLensVerification(input: UseProofLensVerificationInput): ProofLensVerificationView {
  const [status, setStatus] = useState<ProofLensVerificationView["status"]>("idle");
  const [report, setReport] = useState<VerificationReport>();
  const [error, setError] = useState<string>();
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    const img = input.image ?? input.imgRef?.current ?? null;
    if (img === null || input.enabled === false) return;
    let cancelled = false;
    setStatus("loading");
    void verifyFromImageElement(img, {
      ...(input.registryLookup === undefined ? {} : { registryLookup: input.registryLookup }),
      ...(input.verifyC2pa === undefined ? {} : { verifyC2pa: input.verifyC2pa }),
      ...(input.registryRecord === undefined ? {} : { registryRecord: input.registryRecord }),
      ...(input.detachedEnvelope === undefined ? {} : { detachedEnvelope: input.detachedEnvelope }),
      ...(input.legacyManifest === undefined ? {} : { legacyManifest: input.legacyManifest }),
      ...(input.now === undefined ? {} : { now: input.now }),
      ...(input.online === undefined ? {} : { online: input.online })
    }).then((next) => {
      if (cancelled) return;
      setReport(next);
      setError(undefined);
      setStatus("ready");
    }).catch((caught: unknown) => {
      if (cancelled) return;
      setReport(undefined);
      setError(caught instanceof Error ? caught.message : "Verification failed");
      setStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [
    generation,
    input.enabled,
    input.image,
    input.imgRef,
    input.detachedEnvelope,
    input.legacyManifest,
    input.now,
    input.online,
    input.registryLookup,
    input.registryRecord,
    input.verifyC2pa
  ]);

  const view: ProofLensVerificationView = { status, refresh };
  if (report !== undefined) view.report = report;
  if (error !== undefined) view.error = error;
  return view;
}
