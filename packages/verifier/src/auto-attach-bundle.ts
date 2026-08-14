import { ProofLens, autoAttach } from "./auto-attach.js";

const root = globalThis as typeof globalThis & { ProofLens?: typeof ProofLens };
root.ProofLens = ProofLens;
autoAttach();
