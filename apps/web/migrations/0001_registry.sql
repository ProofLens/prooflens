CREATE TABLE identity_records (
  kid TEXT PRIMARY KEY NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json)),
  updated_at TEXT NOT NULL
);

CREATE TABLE manifests (
  digest TEXT PRIMARY KEY NOT NULL CHECK (length(digest) = 64),
  envelope_json TEXT NOT NULL CHECK (json_valid(envelope_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX identity_records_status_idx
  ON identity_records (json_extract(record_json, '$.status'));
