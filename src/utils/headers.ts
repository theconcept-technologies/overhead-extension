/**
 * HTTP header helpers: the declarativeNetRequest `append` allowlist, sensitive
 * header detection, and masking for the UI. All comparisons are case-insensitive.
 */

/**
 * Request headers for which DNR supports the `append` operation.
 * Source: chrome.declarativeNetRequest docs (case-insensitive here).
 */
const APPEND_ALLOWLIST = new Set(
  [
    'accept',
    'accept-encoding',
    'accept-language',
    'access-control-request-headers',
    'cache-control',
    'connection',
    'content-language',
    'cookie',
    'forwarded',
    'if-match',
    'if-none-match',
    'keep-alive',
    'range',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'via',
    'want-digest',
    'x-forwarded-for',
  ].map((h) => h.toLowerCase())
);

/** Response headers commonly appended (e.g. Set-Cookie) — DNR allows append here. */
const RESPONSE_APPEND_ALLOWLIST = new Set(['set-cookie'].map((h) => h.toLowerCase()));

/** Headers that carry credentials/identity — surfaced with a warning + masked. */
const SENSITIVE_HEADERS = new Set(
  [
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token',
    'x-xsrf-token',
  ].map((h) => h.toLowerCase())
);

export function canAppend(headerName: string, target: 'request' | 'response'): boolean {
  const h = headerName.trim().toLowerCase();
  return target === 'request'
    ? APPEND_ALLOWLIST.has(h)
    : RESPONSE_APPEND_ALLOWLIST.has(h);
}

export function isSensitiveHeader(headerName: string): boolean {
  return SENSITIVE_HEADERS.has(headerName.trim().toLowerCase());
}

/** Mask a sensitive value for display, keeping a short prefix for recognition. */
export function maskValue(value: string): string {
  if (!value) return '';
  if (value.length <= 6) return '••••';
  return `${value.slice(0, 3)}••••${value.slice(-2)}`;
}
