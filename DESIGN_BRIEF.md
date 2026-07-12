# Overhead — Design Brief für Claude Design

Dieses Dokument ist so gebaut, dass du die einzelnen **Prompt-Blöcke direkt in Claude
Design kopieren** kannst. Erklärtext ist auf Deutsch, die Prompts auf Englisch
(funktioniert in Design-Tools am zuverlässigsten — du kannst sie aber auch auf Deutsch
geben). Am Ende steht, **was du mir zurückgibst**, damit ich es 1:1 in den Code einbaue.

---

## 0) Produkt in einem Satz

**Overhead** ist eine Chrome-Extension zum Bearbeiten von HTTP-Request- & Response-Headern,
mit der man **ganze Environments (LIVE / DEV / Staging) per Klick umschaltet** — 100 % lokal,
kein Tracking, Open Source.

- **Positionierung / USP:** „The header editor you can actually trust." Der vertrauenswürdige
  Nachfolger von ModHeader (das wegen Spyware aus dem Store flog).
- **Zielgruppe:** Web-Entwickler:innen, QA/Tester, API-Leute.
- **Marken-Charakter:** _präzise, ruhig, technisch-elegant, vertrauenswürdig._ Nicht verspielt,
  nicht „consumer-bunt", nicht aggressiv. Denk „Developer-Tool mit gutem Geschmack" (Linear,
  Raycast, Vercel-Ästhetik) — aber eigenständig.
- **Muss in Light & Dark funktionieren.** Entwickler nutzen oft Dark Mode.
- **Wortspiel-Anker:** „Overhead" = das, was oben drauf sitzt (Header) + „Overhead"-Balken.
  Das Icon darf mit gestapelten „Header-Zeilen" spielen.

---

## 1) Deliverables (Übersicht)

| # | Deliverable | Format | Für |
|---|---|---|---|
| A | Logo + App-Icon-Set | Master-SVG + PNG 16/32/48/128, Light+Dark | Extension-Icon, Store, Landingpage |
| B | Farb- & Token-System | Hex-Tabelle + Tailwind-Snippet | Ich verdrahte es im Code |
| C | Popup-UI Mockup (380 px breit) | PNG/Figma | Referenz für Feinschliff |
| D | Options/Settings-UI Mockup (Vollseite) | PNG/Figma | Referenz für Feinschliff |
| E | Chrome-Web-Store-Assets | Marquee 1400×560, Tile 440×280, 3–5 Screenshots 1280×800 | Store-Listing |

Wichtig: A und B sind das, was ich **zwingend** für die Integration brauche. C/D/E sind
Referenz + Marketing.

---

## 2) Copy-Bank (fertige Texte zum Verwenden)

- **Name:** Overhead
- **Tagline (kurz):** The header editor you can actually trust.
- **Tagline (DE):** Der Header-Editor, dem du wirklich vertrauen kannst.
- **One-liner:** Modify HTTP request & response headers. Switch environments in one click.
- **Trust-Claims (für Store/Assets):** 100% local · No tracking · No ads · Open source.
- **Feature-Bullets:** Environment groups (LIVE/DEV/Staging) · Request & response headers ·
  URL & regex conditions · Import from ModHeader · Works offline.

---

## 3) PROMPT A — Logo & Icon-Set

> Design a logo and full icon set for a developer browser extension called **Overhead**.
>
> **What it does:** edits HTTP request/response headers and switches environments (LIVE/DEV/Staging).
> **Personality:** precise, calm, technical, trustworthy — in the taste range of Linear / Raycast /
> Vercel, but original. Not playful, not consumer-colorful.
>
> **Concept direction:** a minimal geometric mark built from **stacked horizontal "header" bars**
> (2–3 lines) inside or beside a rounded square — evoking both HTTP headers and the word
> "Overhead" (something sitting on top). A subtle switch/toggle motif is welcome but optional.
> One confident accent color on a neutral base. Must read clearly at **16px** and look great at
> **128px**.
>
> **Deliverables:**
> - Master logo (horizontal lockup: mark + "Overhead" wordmark) in light and dark versions.
> - App icon (mark only) as a scalable SVG.
> - Exported PNGs at 16, 32, 48, and 128 px, transparent background, with a small safe-area margin.
> - A light variant and a dark variant of the app icon.
>
> Keep it flat, no photorealism, no gradients heavier than a subtle single-hue shade. Provide the
> exact hex colors used.

---

## 4) PROMPT B — Farb- & Token-System

Der Code erwartet ein paar konkrete Tokens. Bitte lass Claude Design **genau diese** Werte
liefern (Hex), dann verdrahte ich sie in `tailwind.config.cjs` und `src/types.ts`.

Benötigte Tokens:
- **Primary accent** (`brand.DEFAULT`), **accent hover** (`brand.hover`), **accent tint** (heller
  Hintergrund für Hover/Selektion, `brand.tint`).
- **Neutrals** für Light & Dark (Hintergrund, Karten, Rahmen, Text primär/sekundär).
- **6 Environment-Farben** (für die Chips LIVE/DEV/Staging + 3 weitere). Müssen als runde
  „Chips" in **beiden** Themes gut lesbar sein und sich klar voneinander unterscheiden.
  Semantik-Vorschlag: LIVE = rot/kräftig (Achtung!), DEV = grün, Staging = amber.
- **Status:** success (aktiv), warning (sensible Header), danger (löschen).

> Create a cohesive color system + design tokens for **Overhead**, a security-focused developer
> tool (HTTP header editor), that works in both light and dark mode.
>
> Provide, as a table of hex values:
> 1. **Primary accent**, **accent hover**, and a very light **accent tint** background.
> 2. **Neutral scale** for light mode and dark mode: page background, surface/card, border,
>    text-primary, text-secondary.
> 3. **6 environment colors** used as pill chips (LIVE, DEV, Staging, + 3 spare). They must be
>    mutually distinct and legible as small colored pills on both light and dark backgrounds.
>    Suggested semantics: LIVE = strong red, DEV = green, Staging = amber.
> 4. **Semantic status colors:** success, warning, danger.
>
> The overall feel: restrained, professional, trustworthy — not neon, not pastel. Then output the
> palette as (a) a hex table and (b) a Tailwind `theme.extend.colors` snippet.

---

## 5) PROMPT C — Popup-UI (380 px breit)

Das Popup ist bereits gebaut — bitte gestalte **exakt dieses Layout** schön, damit das Mockup
auf den Code passt.

> Design a compact Chrome extension **popup**, **380px wide**, for **Overhead** (HTTP header editor).
> Light and dark versions.
>
> Layout, top to bottom:
> 1. **Header bar:** product name "Overhead" on the left with a small "N active" count badge; a
>    master on/off toggle on the right.
> 2. **Environments row:** a wrapping row of **colored pill chips** (LIVE, DEV, Staging, …). The
>    active chip is filled with its environment color; inactive chips are outlined with a small
>    color dot. A dashed "+ New" chip at the end.
> 3. **Active headers list:** for each active environment, its name with a color dot, then a dense
>    list of monospaced rows. Each row: a small REQ/RES tag, the header name, and its value
>    (credential values shown masked, e.g. `Bea••••34`).
> 4. **Footer:** a "Manage rules →" link on the left, a subtle "♥ Support" link on the right.
>
> Keep it dense but calm, developer-tool aesthetic, generous vertical rhythm, clear active/inactive
> states. Use the brand accent and the environment colors from the palette.

---

## 6) PROMPT D — Options / Settings (Vollseite)

> Design a full-page **settings/editor** view for **Overhead** (HTTP header editor). Light and dark.
>
> Layout:
> - **Top bar:** "Overhead" + tagline "The header editor you can actually trust"; on the right a
>   theme selector (System/Light/Dark), Import and Export buttons, and a master enable toggle.
> - **Left sidebar:** list of environments, each with a color dot, name, and an active/inactive
>   status dot; a dashed "+ Add environment" button at the bottom.
> - **Main panel** (editing one environment):
>   - color picker + large environment name field + "Active" checkbox + subtle "Delete".
>   - an "Exclusive group" field (only one env with the same tag active at a time).
>   - an "Apply to" card: a match-type selector (All URLs / URL wildcard / URL regex) + pattern
>     input, and an advanced collapsible with resource-type chips.
>   - an amber **security warning banner** when credential headers (Authorization/Cookie) are used.
>   - a **Headers table**: each row has an enable checkbox, REQ/RES selector, op selector
>     (set/append/remove), a monospaced header-name input (highlighted if sensitive), and a value
>     input. Buttons "+ Request" and "+ Response".
>
> Aesthetic: clean, keyboard-friendly, information-dense but well-spaced, like a well-made devtool.
> Use the palette from Prompt B.

---

## 7) PROMPT E — Chrome Web Store Assets

> Design Chrome Web Store marketing assets for **Overhead**, an HTTP header editor extension.
> Consistent with the brand (accent + neutrals, dark-devtool-friendly).
>
> Produce:
> 1. **Marquee promo tile 1400×560** — hero with the logo, headline "Switch environments. Modify
>    headers. Trust your tools." and the trust strip "100% local · No tracking · No ads · Open source".
> 2. **Small promo tile 440×280** — logo + name + one-line tagline.
> 3. **3–5 screenshots at 1280×800**, each with a short caption bar, showing: (a) the environment
>    switcher / LIVE↔DEV, (b) editing request & response headers, (c) URL/regex conditions,
>    (d) the "100% local, no tracking, open source" trust message, (e) one-click ModHeader import.
>
> Use real UI (from the popup/options mockups) framed on a clean background. Keep text minimal and
> confident.

---

## 8) Was du mir zurückgibst (für die Integration)

Damit ich es direkt einbaue, brauche ich:

1. **Icons:** die 4 PNGs `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` (transparent)
   → kommen nach `src/icons/` (ersetzen die Platzhalter). Plus das Master-SVG nach `src/icons/`.
2. **Farb-Tokens:** die Hex-Tabelle **oder** direkt das Tailwind-`colors`-Snippet. Ich trage ein:
   - `brand.DEFAULT / brand.hover / brand.tint` → `tailwind.config.cjs`
   - die 6 Environment-Farben → `GROUP_COLORS` in `src/types.ts`
   - success/warning/danger → wo im UI genutzt.
3. **Optional:** Logo-Lockup (SVG/PNG) für README/Landingpage und die Store-Assets als PNG.

Sag mir einfach Bescheid bzw. leg die Dateien ab — dann ziehe ich Icons + Palette ein und wir
haben das fertige Branding live. Bis dahin läuft alles mit neutralen Platzhalter-Tokens.

---

### Schnell-Referenz: aktuelle Platzhalter-Werte (die du ersetzt)

- Primary accent: `#4f46e5` (Indigo) — `tailwind.config.cjs` → `brand`
- Environment-Palette (`src/types.ts` → `GROUP_COLORS`):
  `#ef4444` (LIVE) · `#22c55e` (DEV) · `#f59e0b` (Staging) · `#3b82f6` · `#a855f7` · `#14b8a6`
- Badge „aktiv": `#22c55e` (`src/background.ts`)
