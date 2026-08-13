# ProofLens Signer (Python CLI)

[![CI](https://github.com/ProofLens/prooflens-signer/actions/workflows/ci.yml/badge.svg)](https://github.com/ProofLens/prooflens-signer/actions/workflows/ci.yml)

Generate and verify lightweight image manifests for ProofLens.

---

## Install
```bash
# Windows PowerShell
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt  # if used; else none required
Usage
bash
Copy code
# Sign one image → writes image.jpg.manifest.json
python -m prooflens_sign sign path/to/image.jpg --creator "Your Name"

# Verify one image against its manifest
python -m prooflens_sign verify path/to/image.jpg path/to/image.jpg.manifest.json

# Verify all images in a folder (looks for matching *.manifest.json)
python -m prooflens_sign verify-all path/to/folder
Manifest fields (v0)
json
Copy code
{
  "manifest_version": "demo-1",
  "created_at": "2025-09-29T00:00:00Z",
  "tool": "prooflens-signer",
  "creator": "Your Name",
  "source_file": "image.jpg",
  "source_sha256": "…hex…",
  "asset": { "filename": "image.jpg", "mime": "image/jpeg", "bytes": 12345, "sha256": "…hex…" },
  "signing": { "type": "demo-self-signed", "key_id": "local", "note": "" },
  "edits": []
}
Notes
Integrity only (hash match). For identity/cert-based signing, see docs/roadmap.md.

License
MIT