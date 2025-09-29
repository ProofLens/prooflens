<h1 align="center">ProofLens — Invisible Proof for Images</h1>

<p align="center">
  <a href="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml">
    <img src="https://github.com/ProofLens/prooflens/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

**Add a tiny verified credit-line — click to see creator and verify file integrity.  
No on-image overlays. Paste two lines.**

[Live demo](https://prooflens.netlify.app/demo-embed.html) •
[Verify tool](https://prooflens.netlify.app/verify.html) •
[Site](https://prooflens.netlify.app)

---

## Why it matters
- **Credit that travels** — creators get visible attribution (caption chip) without changing editor workflow.
- **Integrity you can click** — SHA-256 of the *exact* file; if bytes change, it fails.
- **Zero-step for editors** — one-time header install; auto-link manifests (plugin/edge planned).

## What’s inside
- `site/` — Netlify demo pages (caption-mode, header-only)
- `docs/` — architecture, manifest schema, security, roadmap
- `examples/` — 2-line snippets + sample manifest

**Related repos**
- Verify widget (browser): https://github.com/ProofLens/prooflens-verify-widget  
- Signer CLI (Python): https://github.com/ProofLens/prooflens-signer

## 1-minute quickstart
```html
<!-- caption-mode (no overlay) -->
<script src="https://prooflens.netlify.app/assets/prooflens-verify-lite.js"></script>

<figure>
  <img src="/path/photo.jpg"
       data-manifest-url="/path/photo.jpg.manifest.json"
       alt="">
  <figcaption class="credit">Photo: Your Name</figcaption>
</figure>
How it works
A small *.manifest.json stores sha256, creator, and created_at.

The browser (WebCrypto) hashes the displayed image and compares to the manifest.

Match ⇒ ✓ verified; mismatch ⇒ check failed.

Roadmap
WordPress Auto-CR (one-time install; auto-manifests on upload)

Edge auto-manifest (Netlify/Cloudflare) with Link: rel="content-credentials"

Trust dashboard + DMCA evidence bundle

License
MIT