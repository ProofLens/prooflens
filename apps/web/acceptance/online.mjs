import assert from "node:assert/strict";

const base = process.argv[2];
const expectedEnvironment = process.argv[3];
if (base === undefined || expectedEnvironment === undefined) {
  throw new Error("Usage: node acceptance/online.mjs <base-url> <environment>");
}

const kid = "https://registry.example.test/v1/keys/golden";
const digest = "4093a532cd54a50e68c64bb8dae578f587c6687ca98c06765dde3f35849525f4";

const health = await fetch(`${base}/api/health`, { cache: "no-store" });
assert.equal(health.status, 200);
assert.equal(health.headers.get("cache-control"), "no-store");
assert.equal(health.headers.get("access-control-allow-origin"), "*");
const healthBody = await health.json();
assert.equal(healthBody.ok, true);
assert.equal(healthBody.environment, expectedEnvironment);
assert.match(healthBody.version, /^[0-9a-f-]{36}$/u);

const identityUrl = `${base}/api/v1/identities?kid=${encodeURIComponent(kid)}`;
const identity = await fetch(identityUrl, { cache: "no-store" });
assert.equal(identity.status, 200);
assert.equal(identity.headers.get("cache-control"), "no-cache");
const etag = identity.headers.get("etag");
assert.ok(etag);
const identityBody = await identity.json();
assert.equal(identityBody.kid, kid);
assert.equal(identityBody.identity.displayName, "Golden Creator (Phase 6 test identity)");
assert.ok(["trusted", "revoked"].includes(identityBody.status));

const conditional = await fetch(identityUrl, { headers: { "If-None-Match": etag }, cache: "no-store" });
assert.equal(conditional.status, 304);

const revocation = await fetch(`${base}/api/v1/revocations?kid=${encodeURIComponent(kid)}`, { cache: "no-store" });
assert.equal(revocation.status, 200);
const revocationBody = await revocation.json();
assert.equal(revocationBody.kid, kid);
assert.equal(revocationBody.status, identityBody.status);

const manifest = await fetch(`${base}/api/v1/manifests/${digest}`, { cache: "no-store" });
assert.equal(manifest.status, 200);
assert.equal(manifest.headers.get("cache-control"), "public, max-age=31536000, immutable");
const manifestBody = await manifest.json();
assert.equal(manifestBody.claim.asset.sha256, digest);
assert.equal(manifestBody.signature.kid, kid);

const missing = await fetch(`${base}/api/v1/identities?kid=${encodeURIComponent("https://registry.example.test/v1/keys/missing")}`, { cache: "no-store" });
assert.equal(missing.status, 404);
assert.equal(missing.headers.get("cache-control"), "no-store");

const invalid = await fetch(`${base}/api/v1/identities?kid=not-https`, { cache: "no-store" });
assert.equal(invalid.status, 400);
const denied = await fetch(`${base}/api/v1/identities`, { method: "POST" });
assert.equal(denied.status, 405);
assert.equal(denied.headers.get("allow"), "GET, HEAD, OPTIONS");

const options = await fetch(`${base}/api/v1/identities`, { method: "OPTIONS" });
assert.equal(options.status, 204);
assert.equal(options.headers.get("access-control-allow-origin"), "*");

const demo = await fetch(base, { cache: "no-store" });
assert.equal(demo.status, 200);
assert.match(demo.headers.get("content-type") ?? "", /text\/html/u);
const html = await demo.text();
assert.match(html, /<div id="root"><\/div>/u);
const scriptPath = html.match(/<script[^>]+src="([^"]+)"/u)?.[1];
assert.ok(scriptPath);
const script = await fetch(new URL(scriptPath, base));
assert.equal(script.status, 200);
assert.match(script.headers.get("content-type") ?? "", /javascript/u);

console.log(JSON.stringify({ environment: expectedEnvironment, version: healthBody.version, status: identityBody.status }));
