/**
 * The heart of Overhead: compile the local data model into
 * chrome.declarativeNetRequest dynamic rules and apply them atomically.
 *
 * Trust note: we never read requests. DNR evaluates and mutates headers inside
 * the browser; the extension only declares rules.
 */
import { HeaderGroup, ResourceType, StorageData } from '../types';
import { canAppend } from './headers';

type DNR = typeof chrome.declarativeNetRequest;
type Rule = chrome.declarativeNetRequest.Rule;
type HeaderInfo = chrome.declarativeNetRequest.ModifyHeaderInfo;

const ALL_RESOURCE_TYPES: ResourceType[] = [
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'script',
  'stylesheet',
  'image',
  'font',
  'media',
  'websocket',
  'other',
];

function dnr(): DNR | undefined {
  return typeof chrome !== 'undefined' ? chrome.declarativeNetRequest : undefined;
}

function buildHeaderInfos(
  group: HeaderGroup,
  target: 'request' | 'response'
): HeaderInfo[] {
  const infos: HeaderInfo[] = [];
  for (const h of group.headers) {
    if (!h.enabled || h.target !== target) continue;
    const name = h.name.trim();
    if (!name) continue;

    if (h.op === 'remove') {
      infos.push({ header: name, operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation });
    } else {
      // Fall back to `set` when `append` isn't allowed for this header — keeps
      // the generated ruleset valid even if the UI guard is bypassed.
      const operation =
        h.op === 'append' && canAppend(name, target) ? 'append' : 'set';
      infos.push({
        header: name,
        operation: operation as chrome.declarativeNetRequest.HeaderOperation,
        value: h.value,
      });
    }
  }
  return infos;
}

/**
 * A group can yield several DNR conditions — the 'urls' mode emits one condition
 * per wildcard pattern so a group can match a list of sites.
 */
function buildConditions(
  group: HeaderGroup
): chrome.declarativeNetRequest.RuleCondition[] {
  const resourceTypes = (
    group.condition.resourceTypes && group.condition.resourceTypes.length > 0
      ? group.condition.resourceTypes
      : ALL_RESOURCE_TYPES
  ) as chrome.declarativeNetRequest.ResourceType[];

  const mt = group.condition.matchType;
  if (mt === 'urls') {
    const pats = (group.condition.patterns ?? []).map((p) => p.trim()).filter(Boolean);
    // An empty URL list intentionally matches nothing (no rules emitted).
    return pats.map((p) => ({ resourceTypes, urlFilter: p }));
  }

  const condition: chrome.declarativeNetRequest.RuleCondition = { resourceTypes };
  const pattern = (group.condition.pattern ?? '').trim();
  if (mt === 'urlFilter' && pattern) {
    condition.urlFilter = pattern;
  } else if (mt === 'regexFilter' && pattern) {
    condition.regexFilter = pattern;
  }
  return [condition];
}

/**
 * Pure: turn storage into a list of DNR rules. Each enabled group becomes one
 * modifyHeaders rule. Rule ids are assigned sequentially from 1.
 */
export function compileRules(data: StorageData): Rule[] {
  if (!data.enabled) return [];
  const rules: Rule[] = [];
  let id = 1;

  for (const group of data.groups) {
    if (!group.enabled) continue;
    const requestHeaders = buildHeaderInfos(group, 'request');
    const responseHeaders = buildHeaderInfos(group, 'response');
    if (requestHeaders.length === 0 && responseHeaders.length === 0) continue;

    const action: chrome.declarativeNetRequest.RuleAction = {
      type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
    };
    if (requestHeaders.length) action.requestHeaders = requestHeaders;
    if (responseHeaders.length) action.responseHeaders = responseHeaders;

    for (const condition of buildConditions(group)) {
      rules.push({ id: id++, priority: 1, action, condition });
    }
  }

  return rules;
}

/** Count of individual header operations currently active (for the badge). */
export function countActiveHeaderOps(data: StorageData): number {
  if (!data.enabled) return 0;
  return data.groups
    .filter((g) => g.enabled)
    .reduce((sum, g) => sum + g.headers.filter((h) => h.enabled && h.name.trim()).length, 0);
}

export interface ApplyResult {
  applied: number;
  /** Rules Chrome rejected (e.g. invalid regexFilter) — skipped so the rest work. */
  failed: number;
}

/**
 * Replace all dynamic rules with the freshly compiled set.
 *
 * `updateDynamicRules` is atomic: if a single rule is invalid (a bad regexFilter,
 * or a responseHeaders action on Chrome < 116) the whole call rejects and NOTHING
 * would be applied. To avoid one broken group silently disabling every rule, we
 * fall back to applying rules one-by-one, skipping only the offenders and
 * reporting how many failed so the UI can flag it.
 */
export async function applyRules(data: StorageData): Promise<ApplyResult> {
  const api = dnr();
  if (!api) return { applied: 0, failed: 0 };
  const existing = await api.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = compileRules(data);

  try {
    await api.updateDynamicRules({ removeRuleIds, addRules });
    return { applied: addRules.length, failed: 0 };
  } catch {
    // Clear everything, then re-add valid rules individually.
    await api.updateDynamicRules({ removeRuleIds, addRules: [] });
    let applied = 0;
    let failed = 0;
    for (const rule of addRules) {
      try {
        await api.updateDynamicRules({ addRules: [rule] });
        applied += 1;
      } catch (e) {
        failed += 1;
        console.error('[Overhead] skipped invalid rule', rule.id, e);
      }
    }
    return { applied, failed };
  }
}

/** Async-validate a regex against Chrome's DNR engine (returns null if OK). */
export async function validateRegex(pattern: string): Promise<string | null> {
  const api = dnr();
  if (!api || !api.isRegexSupported || !pattern) return null;
  try {
    const res = await api.isRegexSupported({ regex: pattern });
    return res.isSupported ? null : res.reason ?? 'Unsupported regex';
  } catch {
    return 'Invalid regex';
  }
}
