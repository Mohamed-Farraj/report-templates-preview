# Report Templates Preview

Arabic RTL static preview for five Digital Library report templates. Edit sample fields, compare template variables, and supply local logo images. Every preview remains visibly watermarked as unofficial.

## Run locally

Requires Node.js 22+ for validation/build, or Python for a local preview. No package installation is needed.

```sh
npm run lint
npm run build
python -m http.server 4173
```

Open http://localhost:4173. The build produces a deployable `dist/` copy.

## GitHub Pages

In repository Settings → Pages, select **Deploy from a branch**, **main**, **/(root)**, then Save. All URLs are relative and template selection uses URL fragments, so project subpaths work without rewrites. Future commits to main publish automatically.

## Files

- `index.html`: semantic application shell and bundled template JSON.
- `app.js`: rendering, preview controls, safe text substitution, validated browser persistence, and image validation.
- `styles.css`: responsive shell; report styles remain bundled with each template.
- `favicon.svg`: local icon; `.nojekyll` enables plain static hosting.
- `verify.mjs`: dependency-free source and template-contract checks.
- `build.mjs`: validates and copies only public runtime files into `dist/`.

## Data and limits

There is no backend, login, database, official report issuance, or PDF-generation service. Field values and images stay in the current browser's local storage; use the clear-data control to remove them. Do not use personal data on shared devices. No analytics, remote fonts, or external runtime dependencies are loaded. Images must be PNG/JPEG/WebP, at most 1 MiB and 4096 pixels per dimension. Missing logos use placeholders. Browser storage can be disabled or full; the UI reports failures and continues in memory.

Template HTML/CSS is bundled, developer-maintained content. User-entered values are inserted with textContent. Do not add unreviewed third-party templates. A restrictive meta CSP blocks external scripts, connections, and form submission. GitHub Pages does not offer application-specific HTTP response-header configuration; configure stronger response headers at a proxy if required.
