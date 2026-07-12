/**
 * Common HTTP header names for autocomplete + one-click templates.
 * Purely local data — no network, on brand with the trust story.
 */
import { HeaderRule } from '../types';

/** Suggested via a native <datalist> on every header-name input. */
export const COMMON_HEADER_NAMES: string[] = [
  'Authorization',
  'User-Agent',
  'Accept',
  'Accept-Language',
  'Accept-Encoding',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'Referer',
  'Origin',
  'X-Requested-With',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Real-IP',
  'X-Api-Key',
  'X-CSRF-Token',
  'If-None-Match',
  'If-Modified-Since',
  'Range',
  'DNT',
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Content-Security-Policy',
  'Set-Cookie',
  'X-Frame-Options',
  'Strict-Transport-Security',
  'X-Cache-Status',
];

export type HeaderTemplate = Pick<HeaderRule, 'target' | 'op' | 'name' | 'value'> & {
  label: string;
};

/** One-click starting points for the most common tasks. */
export const HEADER_TEMPLATES: HeaderTemplate[] = [
  { label: 'Bearer token', target: 'request', op: 'set', name: 'Authorization', value: 'Bearer ' },
  { label: 'Basic auth', target: 'request', op: 'set', name: 'Authorization', value: 'Basic ' },
  { label: 'Custom User-Agent', target: 'request', op: 'set', name: 'User-Agent', value: '' },
  { label: 'X-Forwarded-For', target: 'request', op: 'set', name: 'X-Forwarded-For', value: '127.0.0.1' },
  { label: 'Accept-Language', target: 'request', op: 'set', name: 'Accept-Language', value: 'en-US,en;q=0.9' },
  { label: 'Cache-Control: no-cache', target: 'request', op: 'set', name: 'Cache-Control', value: 'no-cache' },
  { label: 'JSON Content-Type', target: 'request', op: 'set', name: 'Content-Type', value: 'application/json' },
  { label: 'CORS: allow all origins', target: 'response', op: 'set', name: 'Access-Control-Allow-Origin', value: '*' },
  { label: 'Strip CSP header', target: 'response', op: 'remove', name: 'Content-Security-Policy', value: '' },
];
