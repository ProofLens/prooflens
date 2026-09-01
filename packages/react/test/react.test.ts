import { describe, expect, it } from "vitest";
import { ProofLensFigure, ProofLensStatus, useCreatorIdentity, useProofLensVerification } from "../src/index.js";

describe("react exports", () => {
  it("exposes verifier components and the creator-identity hook", () => {
    expect(ProofLensFigure).toBeTypeOf("function");
    expect(ProofLensStatus).toBeTypeOf("function");
    expect(useProofLensVerification).toBeTypeOf("function");
    expect(useCreatorIdentity).toBeTypeOf("function");
  });
});
