---
name: visual-qa
description: Perform evidence-based UI visual and interaction QA. Use for frontend changes, responsive-layout checks, accessibility review, screenshot validation, or visual regressions.
---

1. Run the actual UI and inspect it at widths 320, 375, 768, and 1280 pixels.
2. Exercise landing, loading, success, error, and empty states when they exist.
3. Check keyboard navigation, visible focus, reduced-motion behavior, text wrapping, clipping, and horizontal overflow.
4. Capture screenshots for the relevant states and widths; compare before/after when reviewing a change.
5. Inspect browser/runtime errors and failed resources alongside visual evidence.
6. Fix or recommend changes only for concrete observed issues. Do not redesign the interface without an identified defect or explicit request.
7. Report inspected states, viewport evidence, failures, and untested surfaces.
