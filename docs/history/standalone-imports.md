# Standalone history import record

Recorded for Phase 0 on 2026-08-12. All source access was read-only; neither standalone GitHub repository was changed or archived.

| Repository | Source URL | Final standalone commit | Original tags | Imported path | Rollback reference |
| --- | --- | --- | --- | --- | --- |
| signer | `https://github.com/ProofLens/prooflens-signer.git` | `20e248ac2de56bc49a60478c315ba6baf378fd4f` | `v0.1.0` -> `44c8e6230e215195554f45ab5282c590004733d3` | `legacy/signer` | `refs/tags/rollback/signer/final-standalone` |
| verify widget | `https://github.com/ProofLens/prooflens-verify-widget.git` | `46bb79519fddc925fee6f856b98e987f444d819e` | `v0.1.0` -> `8fd6b9288f324ff17f246126ac981efaa19d45ac` | `legacy/verify-widget` | `refs/tags/rollback/verify-widget/final-standalone` |

The colliding original `v0.1.0` tag names are preserved as annotated namespaced tags `standalone/signer/v0.1.0` and `standalone/verify-widget/v0.1.0`. Representative root commits are `7b75342c28c85164c179b508f81b6079e8d769ee` (signer) and `1ceb8554f4dcfd09f5dcac5136f9df6ce2f86fc3` (widget).

Both imported repositories retain their MIT `LICENSE` files. Each imported license has SHA-256 `5639963e2ba5c4c9c5233dff729cad06775fab625fb1510cec4ebe850b4493d0`.

The signer documented the `prooflens_sign` Python module/CLI and did not declare a published package registry URL. The widget documented its checked-in `dist/prooflens-verify.min.js` bundle and these public links: `https://prooflens.netlify.app/demo-embed.html`, `https://prooflens.netlify.app/verify.html`, and `https://github.com/ProofLens/prooflens`.

Import-time canonical remotes were `canonical` (`https://github.com/ProofLens/prooflens.git`), plus local read-only source clones exposed as `signer`, `verify-widget`, and `site`. The local `site` source represents the canonical repository history and was not imported as a third standalone history.
