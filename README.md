<h1 align="center">ProofLens — Invisible Proof for Images</h1>



\*\*Add a tiny verified credit-line — click to see creator and verify file integrity. No on-image overlays. Paste two lines.\*\*



\[Live demo](https://prooflens.netlify.app/demo-embed.html) • \[Verify tool](https://prooflens.netlify.app/verify.html) • \[Site](https://prooflens.netlify.app)



---



\## Why it matters

\- \*\*Credit that travels\*\*: Creators get visible attribution (caption chip) without changing editor workflow.

\- \*\*Integrity you can click\*\*: SHA-256 of the exact file; if bytes change, it fails.

\- \*\*Zero-step for editors\*\*: One-time header install; auto-link manifests (plugin/edge planned).



\## What’s inside

\- `signer/` — Python CLI (manifest generator)

\- `verify-widget/` — lightweight browser verifier

\- `site/` — Netlify demo (caption-mode, header-only)

\- `examples/` — 2-line snippets + sample manifest



\## 1-minute quickstart

```html

<!-- caption-mode (no overlay) -->

<script src="https://prooflens.netlify.app/assets/prooflens-verify-lite.js"></script>

<figure>

&nbsp; <img src="/path/photo.jpg" data-manifest-url="/path/photo.jpg.manifest.json" alt="">

&nbsp; <figcaption class="credit">Photo: Your Name</figcaption>

</figure>

How it works

Manifest (*.manifest.json) stores sha256, creator, created_at.

On page load, we hash the image in the browser via WebCrypto and compare.

If match ⇒ ✓ verified; else ⇒ check failed.

Roadmap

WordPress Auto-CR (one-time install; auto-manifests on upload)

Edge auto-manifest (Netlify/CF) with Link: rel="content-credentials"

Trust dashboard + DMCA evidence bundle



