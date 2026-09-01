# ProofLens Verify Widget (Caption-mode, No Overlay)

[![CI](https://github.com/ProofLens/prooflens-verify-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/ProofLens/prooflens-verify-widget/actions/workflows/ci.yml)

**Add a tiny verified credit-line — click to see creator & verify file integrity.  
No on-image badges.**

[Demo](https://prooflens.netlify.app/demo-embed.html) ·
[Verify tool](https://prooflens.netlify.app/verify.html) ·
[Main repo](https://github.com/ProofLens/prooflens)

---

## Quickstart (self-host)
```html
<script src="/dist/prooflens-verify.min.js"></script>

<figure>
  <img src="/images/photo.jpg"
       data-manifest-url="/images/photo.jpg.manifest.json"
       alt="">
  <figcaption class="credit">Photo: Your Name</figcaption>
</figure>
Or use the hosted lite build (no overlay):

html
Copy code
<script src="https://prooflens.netlify.app/assets/prooflens-verify-lite.js"></script>
How it works
We compute SHA-256 of the exact image in the browser (WebCrypto).

Compare to *.manifest.json (sha256, creator, created_at).

If it matches, the caption gets a small ✓ verified chip. No overlay.

Events / API
Auto-attach to any img[data-manifest-url] on load.

Manual: window.ProofLensLite.attach(imgElement)

Event: window.addEventListener('ProofLensVerified', (e) => { /* e.detail = { img, pass } */ })

Files
dist/prooflens-verify.min.js — production bundle

docs/api.md — API & events

Roadmap
WordPress Auto-CR plugin (header once, auto-inject)

Header-only mode via Link: rel="content-credentials"

License
MIT