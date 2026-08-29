UPDATE identity_records
SET record_json = json_set(
  record_json,
  '$.status', 'revoked',
  '$.revocation', json('{"revokedAt":"2026-08-29T12:00:00.000Z","reason":"Phase 6 propagation test"}')
), updated_at = '2026-08-29T12:00:00.000Z'
WHERE kid = 'https://registry.example.test/v1/keys/golden';
