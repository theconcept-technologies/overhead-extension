/**
 * URL matching used for the popup "active on this page" highlight and the
 * per-tab badge. This is a forgiving approximation of Chrome's declarativeNetRequest
 * matching (good enough for the UI); the browser itself does the authoritative
 * matching when it applies the rules.
 */
import { GroupCondition } from '../types';

/** Turn a wildcard pattern (`*`) into a case-insensitive, unanchored RegExp. */
function wildcardToRegExp(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;
  try {
    const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(escaped, 'i');
  } catch {
    return null;
  }
}

/** Effective wildcard patterns for a condition (used for both matching and DNR). */
export function conditionPatterns(condition: GroupCondition): string[] {
  if (condition.matchType === 'urls') {
    return (condition.patterns ?? []).map((p) => p.trim()).filter(Boolean);
  }
  const p = (condition.pattern ?? '').trim();
  return p ? [p] : [];
}

/** Does a group's condition match a given URL? */
export function matchesUrl(condition: GroupCondition, url: string): boolean {
  if (!url) return false;
  switch (condition.matchType) {
    case 'all':
      return true;
    case 'regexFilter': {
      const p = (condition.pattern ?? '').trim();
      if (!p) return true;
      try {
        return new RegExp(p, 'i').test(url);
      } catch {
        return false;
      }
    }
    case 'urlFilter': {
      const r = wildcardToRegExp(condition.pattern ?? '');
      return r ? r.test(url) : true; // empty pattern → treat as all
    }
    case 'urls': {
      const pats = conditionPatterns(condition);
      if (!pats.length) return false; // an empty URL list matches nothing
      return pats.some((p) => {
        const r = wildcardToRegExp(p);
        return r ? r.test(url) : false;
      });
    }
    default:
      return false;
  }
}
