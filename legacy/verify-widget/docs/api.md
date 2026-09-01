\# API \& Events

\- `ProofLensLite.attach(img)`: verify one image (must have `data-manifest-url`).

\- Event `ProofLensVerified`: `detail = { img, pass }`.



\## Manifest fields (v0)

\- `source\_sha256` (hex), `creator`, `created\_at`, `asset{filename,mime,bytes,sha256}`.



