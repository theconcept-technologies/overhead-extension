# Privacy Policy — Overhead

_Last updated: 2026-07-10_

**Overhead does not collect, transmit, sell, or share any data. Full stop.**

## What data the extension handles

- **Your header rules and environment groups.** These are stored locally on your
  device using the browser's `chrome.storage.local` API. They never leave your
  machine.
- **Nothing else.** Overhead does not read the content of your web requests or
  responses. Header modifications are performed by the browser itself through the
  `declarativeNetRequest` API — the extension only declares rules; it cannot see
  the traffic.

## What the extension does NOT do

- No analytics, telemetry, crash reporting, or usage tracking.
- No network requests to any server operated by us or a third party.
- No advertising, no ad injection, no affiliate redirection.
- No remote code loading. All code ships in the extension package.

## Permissions and why they are needed

- `declarativeNetRequest` — to add/remove/modify HTTP headers via browser-native
  rules.
- `storage` — to save your rules locally.
- `host_permissions: <all_urls>` — required for header rules to apply to the
  sites you choose. Rules only run according to the URL conditions you configure.

## Data deletion

Uninstalling the extension removes all locally stored data. You can also clear
everything from the extension's settings.

## Open source

The full source code is public so anyone can verify these claims:
<https://github.com/theconcept-technologies/overhead-extension>

## Contact

theconcept technologies — <https://theconcept-technologies.com>
