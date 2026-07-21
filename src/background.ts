/**
 * Service worker: keeps declarativeNetRequest rules in sync with local storage
 * and shows a PER-TAB badge — the count reflects the headers that actually apply
 * to the tab's current URL (a group's URL condition must match). No message
 * passing needed — the UI writes storage, we react.
 */
import { getStorageData, onStorageChanged } from './utils/storage';
import { ApplyResult, applyRules } from './utils/dnr';
import { StorageData } from './types';
import { matchesUrl } from './utils/urlMatch';

const ACTIVE_COLOR = '#4E5BF6'; // brand accent
const IDLE_COLOR = '#6B6E7A';
const ERROR_COLOR = '#E5484D'; // danger

/** Header ops that actually apply to a given page URL. */
function countForUrl(data: StorageData, url: string): number {
  if (!data.enabled) return 0;
  return data.groups
    .filter((g) => g.enabled && matchesUrl(g.condition, url))
    .reduce((sum, g) => sum + g.headers.filter((h) => h.enabled && h.name.trim()).length, 0);
}

async function setBadge(tabId: number, text: string, color: string, title: string): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ color, tabId });
    await chrome.action.setBadgeText({ text, tabId });
    await chrome.action.setTitle({ title, tabId });
  } catch (e) {
    console.error('[Overhead] badge update failed:', e);
  }
}

async function updateTabBadge(tabId: number, url: string, data?: StorageData, failed = 0): Promise<void> {
  if (failed > 0) {
    await setBadge(tabId, '!', ERROR_COLOR, `Overhead — ${failed} rule${failed === 1 ? '' : 's'} invalid (check your URL regex)`);
    return;
  }
  const d = data ?? (await getStorageData());
  const count = countForUrl(d, url);
  await setBadge(
    tabId,
    count > 0 ? String(count) : '',
    count > 0 ? ACTIVE_COLOR : IDLE_COLOR,
    count > 0
      ? `Overhead — ${count} header${count === 1 ? '' : 's'} active on this page`
      : 'Overhead — nothing active on this page'
  );
}

async function refreshActiveTab(data?: StorageData, failed = 0): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id != null) await updateTabBadge(tab.id, tab.url ?? '', data, failed);
  } catch (e) {
    console.error('[Overhead] refreshActiveTab failed:', e);
  }
}

async function sync(): Promise<void> {
  const data = await getStorageData();
  const result = await applyRules(data);
  await refreshActiveTab(data, result.failed);
}

// Config changed → reapply rules and refresh the active tab's badge.
onStorageChanged((data) => {
  applyRules(data)
    .then((result: ApplyResult) => refreshActiveTab(data, result.failed))
    .catch((e) => console.error('[Overhead] applyRules failed:', e));
});

// Recompute the badge when the active tab or its URL changes.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateTabBadge(tabId, tab.url ?? '');
  } catch (e) {
    console.error('[Overhead] onActivated failed:', e);
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateTabBadge(tabId, tab.url ?? '').catch((e) => console.error('[Overhead] onUpdated failed:', e));
  }
});

// Re-sync on the lifecycle events a service worker can wake for.
chrome.runtime.onInstalled.addListener(() => {
  sync().catch((e) => console.error('[Overhead] sync onInstalled failed:', e));
});
chrome.runtime.onStartup.addListener(() => {
  sync().catch((e) => console.error('[Overhead] sync onStartup failed:', e));
});

// Also sync when the worker is first spun up.
sync().catch((e) => console.error('[Overhead] initial sync failed:', e));
