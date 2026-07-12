/**
 * Core data model for Overhead.
 *
 * A "Group" is an environment (e.g. LIVE, DEV, Staging). It bundles a set of
 * header rules with a URL condition. Groups that share an `exclusiveTag` are
 * mutually exclusive — enabling one disables its siblings (the LIVE/DEV switch).
 *
 * Everything lives locally in chrome.storage.local under a single key.
 */

export type HeaderTarget = 'request' | 'response';
export type HeaderOp = 'set' | 'remove' | 'append';

/** Subset of chrome.declarativeNetRequest.ResourceType we expose in the UI. */
export type ResourceType =
  | 'main_frame'
  | 'sub_frame'
  | 'xmlhttprequest'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'media'
  | 'websocket'
  | 'other';

export interface HeaderRule {
  id: string;
  target: HeaderTarget;
  op: HeaderOp;
  /** Header name, case-insensitive per HTTP. */
  name: string;
  /** Ignored for op === 'remove'. */
  value: string;
  enabled: boolean;
  /** Optional human-friendly label, for display only — never sent over the wire. */
  label?: string;
}

export type MatchType = 'all' | 'urlFilter' | 'regexFilter';

export interface GroupCondition {
  matchType: MatchType;
  /** urlFilter (Chrome wildcard syntax) or a RE2 regex, depending on matchType. */
  pattern: string;
  /** Empty/undefined = all resource types. */
  resourceTypes?: ResourceType[];
}

export interface HeaderGroup {
  id: string;
  name: string;
  /** Hex color used for the environment chip. */
  color: string;
  enabled: boolean;
  /** Siblings sharing this tag are mutually exclusive. Empty = independent. */
  exclusiveTag?: string;
  condition: GroupCondition;
  headers: HeaderRule[];
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface StorageData {
  /** Schema version for forward-compatible migrations. */
  version: number;
  /** Global master switch — when false, no rules are applied at all. */
  enabled: boolean;
  groups: HeaderGroup[];
  theme: ThemePreference;
}

export const SCHEMA_VERSION = 1;

/** Environment palette from the Overhead Brand Kit (Radix-tuned), cycled by index. */
export const GROUP_COLORS = [
  '#E5484D', // LIVE — red
  '#30A46C', // DEV — green
  '#F5A623', // Staging — amber
  '#4C8DF0', // blue
  '#8E4EC6', // violet
  '#12A594', // teal
] as const;
