# SplitTheBill — Claude Code Project

## What this is

A BuBoTek PWA (Progressive Web App) for splitting restaurant bills. Mobile-first, runs fully client-side with no backend. Users can photograph a receipt, enter items manually, assign them to people, and get a per-person cost breakdown with tax and tip.

## File map

| File | Purpose |
|---|---|
| `split-the-bill-final.html` | **Main production file** — vanilla JS, fully self-contained. This is what ships. |
| `split-the-bill-ocr.html` | OCR variant — camera + local OCR to read receipts. Not linked from index yet. |
| `split-the-bill.jsx` | React component source — reference/migration use only, not served directly. |
| `sw.js` | Service Worker — handles offline caching |
| `manifest.json` | PWA manifest — name, icons, theme colors, display mode |
| `index.html` | Shell redirect to `split-the-bill-final.html` |
| `icon-192.png` / `icon-512.png` | PWA icons |

## Stack

- **No build step.** No npm, no bundler, no framework.
- Edit HTML files directly. All JS and CSS lives inline in the HTML.
- React is loaded via CDN if needed (currently not used in the final HTML).
- Static assets only — deployable to any static host (Netlify, GitHub Pages, etc.).

## How to test

- **Quick check:** Open `split-the-bill-final.html` directly in a browser (file:// works for basic testing).
- **PWA / Service Worker testing:** Needs a local HTTP server. Use the `/splitbill-test` skill or run:
  ```
  cmd /c npx serve .
  ```
  Then open `http://localhost:3000` (or the port `serve` reports).
- **Mobile testing:** Serve locally, then open the LAN IP on your phone (e.g. `http://192.168.x.x:3000`).

## Brand

BuBoTek product — use brand colors from the parent BRANDKIT.md when adding UI.

| Token | Value | App usage |
|---|---|---|
| Espresso | `#3A1C0F` | Dark text / headers |
| Terracotta | `#DA7029` | Primary orange (app uses `#E86A33` — close enough) |
| Sage | `#8EAC61` | Accent green |
| Canvas | `#F5F2EA` | Background |

Font: Fraunces (headings) / Source Sans 3 (body) if fonts are ever added — currently uses system fonts.

## Git & GitHub

- Repo is initialized. Use `bubotek` GitHub account for all pushes.
- Run `gh auth switch --user bubotek` before any `git push` or `gh` command.

## Skills available

| Skill | When to use |
|---|---|
| `/splitbill-test` | Launch local server + open browser for manual testing |
| `/run` | General app launch fallback |
| `/verify` | Confirm a change works in the real app |
| `/code-review` | Review diff before shipping |
