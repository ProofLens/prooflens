\# Usage (ProofLens Signer CLI)



\## Sign

```bash

python -m prooflens\_sign sign path/to/image.jpg --creator "Your Name"

\# → writes path/to/image.jpg.manifest.json

Verify (one file)
python -m prooflens_sign verify path/to/image.jpg path/to/image.jpg.manifest.json
# exit 0 if pass, 1 if fail

Verify all (folder)
python -m prooflens_sign verify-all path/to/folder
# looks for *.manifest.json next to each image

Exit codes: 0=ok, 1=failed, 2=error/usage.

Manifest fields: source_sha256, creator, created_at, asset{filename,mime,bytes,sha256}, signing{type,key_id,note}, edits[].

Notes: Integrity only. For certificate signing, see docs/roadmap.md.


