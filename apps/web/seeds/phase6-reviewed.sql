INSERT INTO identity_records (kid, record_json, updated_at) VALUES (
  'https://registry.example.test/v1/keys/golden',
  '{"version":"1.0","kid":"https://registry.example.test/v1/keys/golden","publicKey":{"kty":"EC","crv":"P-256","x":"axfR8uEsQkf4vOblY6RA8ncDfYEt6zOg9KE5RdiYwpY","y":"T-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU","alg":"ES256","use":"sig","key_ops":["verify"],"ext":true},"identity":{"displayName":"Golden Creator (Phase 6 test identity)","reviewedAt":"2026-08-29T00:00:00.000Z"},"status":"trusted","validFrom":"2026-08-13T00:00:00.000Z","validUntil":"2027-08-13T00:00:00.000Z","revocation":null}',
  '2026-08-29T00:00:00.000Z'
) ON CONFLICT(kid) DO UPDATE SET
  record_json = excluded.record_json,
  updated_at = excluded.updated_at;

INSERT INTO manifests (digest, envelope_json, created_at) VALUES (
  '4093a532cd54a50e68c64bb8dae578f587c6687ca98c06765dde3f35849525f4',
  '{"claim":{"version":"1.0","claimId":"urn:uuid:1f4d4862-b36f-4ded-9cc9-4b08cb2f8b43","issuedAt":"2026-08-13T12:00:00.000Z","creatorKid":"https://registry.example.test/v1/keys/golden","asset":{"filename":"golden.jpg","mime":"image/jpeg","bytes":25,"sha256":"4093a532cd54a50e68c64bb8dae578f587c6687ca98c06765dde3f35849525f4"},"creator":{"displayName":"Golden Creator","creditLine":"Photo: Golden Creator","caption":"Cross-language vector"},"edits":[],"locators":{}},"signature":{"alg":"ES256","kid":"https://registry.example.test/v1/keys/golden","value":"9NO7S8SOvgGQMcC7mruzQiBtkKEwDTfsjPigupVSZ8YibdBMdP0Xg2HTSrab2ydkVGXdo3y16aDR0G4DSjAYBg"}}',
  '2026-08-29T00:00:00.000Z'
) ON CONFLICT(digest) DO UPDATE SET
  envelope_json = excluded.envelope_json,
  created_at = excluded.created_at;
