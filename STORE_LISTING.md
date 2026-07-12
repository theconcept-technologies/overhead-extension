# Chrome Web Store — Listing & Submission (Overhead)

Copy-ready content for the Chrome Web Store developer dashboard, plus the
pre-submit checklist. Nothing here ships in the extension.

## Basics

- **Product name:** Overhead — HTTP Header Editor
- **Category:** Developer Tools
- **Default language:** English (German can be added later)
- **Version at submit:** see `manifest.json` (`0.1.0`)

## Summary (short description — max 132 chars)

> Modify HTTP request & response headers and switch environments (LIVE/DEV) in one click. 100% local, no tracking, open source.

## Detailed description

> Overhead is the header editor you can actually trust.
>
> Add, modify, or remove HTTP **request and response headers** while you build and
> test web apps — and switch whole **environments** (LIVE, DEV, Staging, …) with a
> single click. Manage everything right from the toolbar popup: quick inline
> editing, header-name autocomplete, and one-click templates for the headers you
> reach for most (Authorization, User-Agent, X-Forwarded-For, CORS, and more).
>
> **Built to be trusted**
> - 100% local — your rules never leave your device.
> - No tracking, no analytics, no ads. Ever.
> - Open source, so anyone can verify it.
> - Uses Chrome's declarativeNetRequest engine, so the extension can't even read
>   your traffic — it only declares rules the browser applies.
>
> **Features**
> - Request & response headers: set, append, or remove.
> - Environment groups with mutually-exclusive switching (LIVE ↔ DEV).
> - URL wildcard / regex / resource-type conditions.
> - Optional per-header display labels.
> - Import your existing ModHeader setup in one click.
> - Light & dark, keyboard-friendly, fast.
>
> Free and open source, from theconcept technologies.

## Permission justifications (paste into the review form)

- **declarativeNetRequest** — Core function: add / modify / remove HTTP request and
  response headers according to rules the user configures.
- **storage** — Save the user's header rules and preferences locally on their device.
- **host access (`<all_urls>`)** — Header rules can target any site the user chooses;
  the browser requires host access to modify headers for those requests. Rules only
  run according to the user's own URL conditions. No page content is read or injected.

## Single purpose (required statement)

> Overhead modifies HTTP request and response headers and lets developers switch
> between header profiles (environments) while testing websites and APIs.

## Data safety / privacy (dashboard "Privacy" tab)

- **Does this item collect user data?** No.
- **Remote code?** No — all code ships in the package.
- **Data sold/transferred to third parties?** No.
- **Used for anything besides the single purpose?** No.
- **Privacy policy URL:** publish `PRIVACY.md` at a public URL, e.g.
  `https://github.com/theconcept-technologies/overhead-extension/blob/main/PRIVACY.md`
  (available once the repo is public) or a page on theconcept-technologies.com.

## Assets needed before submit

- [ ] **Icon 128×128** — have it (`src/icons/icon-128.png`); Store also uses it.
- [ ] **Screenshots** 1280×800 (or 640×400), 1–5 images. Suggested:
      1. Environment switcher (LIVE ↔ DEV) in the popup
      2. Inline header editing + templates in the popup
      3. The full editor (Options) with conditions + credential warning
      4. A "100% local · no tracking · open source" trust slide
      (Design prompt E in `DESIGN_BRIEF.md` produces these.)
- [ ] **Small promo tile** 440×280 (optional but recommended).
- [ ] **Marquee** 1400×560 (optional).

## Pre-submit checklist

- [ ] Chrome Web Store **developer account** registered (one-time $5 fee) as
      theconcept technologies.
- [ ] Privacy policy hosted at a public URL (see above).
- [ ] Production zip built: `npm run build` → zip `dist/` (or `npm run release:patch`).
- [ ] Load-unpacked smoke test in Chrome passed (popup + options + a real header
      applied on https://httpbin.org/headers).
- [ ] Make the GitHub repo **public** (currently private).
- [ ] Submit for review (header/host-permission extensions may take a few days).
