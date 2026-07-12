# Overhead — HTTP Header Editor

> The header editor you can actually trust. 100% local, no tracking, open source.

Modify HTTP **request** and **response** headers in Chrome, and switch whole
**environments** (LIVE / DEV / Staging) with one click. Built as a trustworthy
successor to the header editors that lost their way — no ads, no telemetry, no
data collection.

## Why Overhead

- **Environment groups.** Bundle a set of headers under LIVE, DEV, Staging, …
  Mark a group as *exclusive* so enabling one disables its siblings — a real
  environment switch.
- **Request & response headers.** `set`, `append` (where allowed), and `remove`.
- **Precise conditions.** Apply per URL wildcard, regex, or resource type.
- **Local & private.** Everything is stored on your device. The extension makes
  no network calls. Header changes run through the browser's
  `declarativeNetRequest` engine, so the extension never reads your traffic.
- **Import/export.** JSON export, plus one-click import of ModHeader exports.

See [SECURITY.md](./SECURITY.md) and [PRIVACY.md](./PRIVACY.md).

## Tech stack

Manifest V3 · Vue 3 + Vite 6 · TypeScript · Tailwind CSS ·
`declarativeNetRequest` dynamic rules.

## Development

```bash
npm install
npm run generate-icons   # placeholder icons (replace with brand assets)
npm run build            # tsc + vite → dist/
```

Load in Chrome:

1. Visit `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.

`npm run dev` runs Vite for fast iteration on the Vue UI (note: extension APIs
only work in the loaded `dist/` build).

## Verify it works

1. Create/enable an environment with a request header, e.g.
   `X-Environment: dev`, condition = All URLs.
2. Open <https://httpbin.org/headers> — your header appears in the JSON echo.
3. Toggle the environment off → the header disappears on reload.
4. The toolbar badge shows the number of active header operations.

## Release

```bash
npm run release:patch   # bump, build, zip → overhead-vX.Y.Z.zip
```

Upload the zip in the Chrome Web Store developer dashboard. Mark the privacy tab
as **"does not collect user data"** and link [PRIVACY.md](./PRIVACY.md).

## Branding

Naming and visual identity are intentionally swappable — change `src/config.ts`
and `src/manifest.json`. Design prompts for generating the logo, palette, and
store assets live in the project plan.

## License

MIT © theconcept technologies
