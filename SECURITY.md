# Security — Overhead

Overhead is built to be the header editor you can actually trust. This document
explains the threat model and our design choices.

## Design principles

1. **Zero network.** The extension makes no outbound requests. There is no
   analytics, no remote config, no "phone home". You can confirm this in
   DevTools → Network while the extension runs.
2. **No request reading.** Header changes use `declarativeNetRequest`. The browser
   evaluates and mutates headers; the extension only declares rules and cannot
   observe the actual traffic. We deliberately do **not** request
   `declarativeNetRequestFeedback` in the production build.
3. **Minimal permissions.** `declarativeNetRequest`, `storage`, and
   `host_permissions`. Nothing else. Each is justified in
   [PRIVACY.md](./PRIVACY.md).
4. **Strict CSP.** Extension pages run under
   `script-src 'self'; object-src 'self'; base-uri 'self'` — no inline scripts,
   no remote code, no `eval`.
5. **No remote code.** Everything executes from the signed package. There is no
   dynamic script injection into pages.
6. **Open source & auditable.** The full source is public, and the build is
   reproducible from it.

## Handling sensitive headers

Headers such as `Authorization`, `Cookie`, `Set-Cookie`, and API keys are:

- flagged with a warning in the editor,
- masked when displayed in the popup summary,
- accompanied by a reminder to scope the URL condition so secrets are not sent to
  unintended hosts.

**You** are responsible for the values you configure. Apply credential headers
only to the specific hosts that need them.

## Reporting a vulnerability

Please email security@theconcept-technologies.com (or open a private security
advisory on GitHub). Do not open a public issue for undisclosed vulnerabilities.
