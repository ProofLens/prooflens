import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dirname, "..");

async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function requireValid(validate, value, label) {
  if (!validate(value)) {
    throw new Error(`${label} failed schema validation: ${JSON.stringify(validate.errors)}`);
  }
}

function requireInvalid(validate, value, label) {
  if (validate(value)) throw new Error(`${label} unexpectedly passed schema validation`);
}

const schemaPaths = {
  envelope: "packages/claim/schemas/prooflens-envelope-v1.schema.json",
  registry: "packages/identity/schemas/registry-identity-v1.schema.json",
  compact: "packages/metadata/schemas/compact-claim-v1.schema.json",
  c2pa: "packages/c2pa-node/schemas/c2pa-assertion-v1.schema.json"
};
const schemas = Object.fromEntries(
  await Promise.all(Object.entries(schemaPaths).map(async ([name, path]) => [name, await json(path)]))
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)])
);

const vector = await json("packages/claim/vectors/prooflens-v1-es256.json");
requireValid(validators.envelope, vector.envelope, "detached envelope vector");

const compactClaim = structuredClone(vector.envelope.claim);
delete compactClaim.asset.bytes;
delete compactClaim.asset.sha256;
requireValid(validators.compact, compactClaim, "compact embedded claim");
requireValid(validators.c2pa, { version: "1.0", compactClaim }, "C2PA ProofLens assertion");

requireValid(validators.registry, {
  version: "1.0",
  kid: vector.envelope.claim.creatorKid,
  publicKey: vector.publicJwk,
  identity: {
    displayName: vector.envelope.claim.creator.displayName,
    reviewedAt: "2026-08-12T12:00:00.000Z"
  },
  status: "trusted",
  validFrom: "2026-08-13T00:00:00.000Z",
  validUntil: "2027-08-13T00:00:00.000Z",
  revocation: null
}, "registry identity record");

requireInvalid(validators.envelope, {
  ...vector.envelope,
  claim: { ...vector.envelope.claim, unexpected: true }
}, "envelope with an extra field");
requireInvalid(validators.compact, {
  ...compactClaim,
  asset: { ...compactClaim.asset, bytes: vector.envelope.claim.asset.bytes, sha256: vector.envelope.claim.asset.sha256 }
}, "compact claim with a recursive final-file binding");

console.log(`Compiled ${Object.keys(schemas).length} JSON Schemas and validated canonical positive and adversarial fixtures.`);
