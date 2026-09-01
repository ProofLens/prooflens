UPDATE identity_records
SET record_json = json_set(
  record_json,
  '$.status', 'trusted',
  '$.revocation', json('null')
), updated_at = '2026-08-29T12:01:00.000Z'
WHERE kid = 'https://registry.example.test/v1/keys/golden';
