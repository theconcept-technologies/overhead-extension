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

function buildCondition(
  group: HeaderGroup
): chrome.declarativeNetRequest.RuleCondition {
  const resourceTypes = (
    group.condition.resourceTypes && group.condition.resourceTypes.length > 0
      ? group.condition.resourceTypes
      : ALL_RESOURCE_TYPES
  ) as chrome.declarativeNetRequest.ResourceType[];

  const condition: chrome.declarativeNetRequest.RuleCondition = { resourceTypes };
  const pattern = group.condition.pattern.trim();
  if (group.condition.matchType === 'urlFilter' && pattern) {
    condition.urlFilter = pattern;
  } else if (group.condition.matchType === 'regexFilter' && pattern) {
    condition.regexFilter = pattern;
  }
  return condition;
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

    rules.push({
      id: id++,
      priority: 1,
      action,
      condition: buildCondition(group),
    });
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

/** Atomically replace all dynamic rules with the freshly compiled set. */
export async function applyRules(data: StorageData): Promise<void> {
  const api = dnr();
  if (!api) return;
  const existing = await api.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = compileRules(data);
  await api.updateDynamicRules({ removeRuleIds, addRules });
}
