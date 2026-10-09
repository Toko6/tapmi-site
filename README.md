# tapmi.pl

Marketing website for TapMi (Jelly Soft) — Polish at `/`, English at `/en/`.

- `src/copy.js` — all text, PL and EN side by side
- `src/config.js` — contact and company details
- `src/site.css`, `src/site.js` — look and behaviour
- `build.js` — renders `public/` (pages, privacy policy, sitemap, robots)
- `serve.js` — local preview: `node serve.js` → http://localhost:4000

Publishing: every push to `main` runs `.github/workflows/pages.yml`, which
builds and deploys to GitHub Pages. The "Book a demo" form posts to the app
at app.tapmi.pl (`POST /api/demo`).

Nothing secret belongs in this repository — it is public.
