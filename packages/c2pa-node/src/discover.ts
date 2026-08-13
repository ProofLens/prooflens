import { discoverProvenance, type ProvenanceDiscovery, type ProvenanceDiscoveryInput } from "@prooflens/metadata";
import type { C2paEvidence } from "./types.js";
import { verifyC2paWithNode } from "./verify-node.js";

export interface ProvenanceWithC2pa {
  discovery: ProvenanceDiscovery;
  c2pa: C2paEvidence;
}

export async function discoverProvenanceWithC2pa(
  input: Omit<ProvenanceDiscoveryInput, "c2paClaim">
): Promise<ProvenanceWithC2pa> {
  const c2pa = await verifyC2paWithNode(input.bytes, input.mime);
  const discovery = await discoverProvenance({
    ...input,
    ...(c2pa.compactClaim === undefined ? {} : { c2paClaim: c2pa.compactClaim })
  });
  if (c2pa.state === "invalid" && discovery.state === "consistent") {
    return {
      c2pa,
      discovery: {
        ...discovery,
        state: "invalid",
        reasons: [...discovery.reasons, ...c2pa.reasons]
      }
    };
  }
  return { discovery, c2pa };
}
