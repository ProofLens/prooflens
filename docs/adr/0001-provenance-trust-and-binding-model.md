# ADR 0001: Provenance trust and binding model

Status: Accepted

## Decision

ProofLens uses separate keys for creator identity signatures and C2PA Generator Product signing. ProofLens identity signature/trust and C2PA validity/trust are reported as separate evidence.

Detached claims may bind the exact final file with SHA-256 and byte length. Embedded provenance cannot recursively contain the complete final-file digest; its asset binding is supplied by the C2PA manifest and claim model.

Unsigned `demo-1` manifests remain read-only legacy integrity and cannot establish trusted identity. Node performs canonical initial C2PA signing, while the browser initially performs C2PA verification only. A production C2PA CA and CAWG identity assertions are deferred.

## Consequences

Implementations and user interfaces must not collapse creator identity, ProofLens trust, C2PA validity, or external C2PA trust into one result. Embedded metadata must not create a self-referential final-file hash.

Detailed architecture, sequencing, and acceptance criteria remain in [the implementation plan](../planning/IMPLEMENTATION_PLAN.md).
