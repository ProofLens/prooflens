\# ProofLens Pilot — Quick Start (Student Media)



\*\*What it is:\*\* A small “CR” badge for your images. Readers click to see who created it and whether the bytes match a signed manifest.



\## Try it on one image

1\) Put `photo.jpg` on your site where it normally lives.

2\) Put `photo.jpg.manifest.json` next to it (we’ll generate this for you).

3\) Add the script:

&nbsp;  <script src="https://cdn.jsdelivr.net/gh/prooflens/prooflens-verify-widget@main/dist/prooflens-verify.min.js"></script>

4\) Add `data-manifest-url` to the `<img>`:

&nbsp;  <img src="/images/photo.jpg" data-manifest-url="/images/photo.jpg.manifest.json" alt="">

5\) Publish. Click \*\*CR\*\* to inspect.



\*\*Notes:\*\* No build tools required. Remove the badge anytime by removing the `<script>` line.



