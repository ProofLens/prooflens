\# Manifest Schema v0 (Demo)



\*\*Top-level keys\*\*

\- `manifest\_version` — "demo-1"

\- `created\_at` — ISO 8601 UTC

\- `tool` — e.g., "prooflens-sign 0.0.2-dev"

\- `creator` — human or org

\- `asset` — `{ filename, mime, bytes, sha256 }`

\- `source\_file` / `source\_sha256` — kept for compatibility

\- `signing` — `{ type, key\_id, note }`

\- `edits` — array of `{ op, ts }`



