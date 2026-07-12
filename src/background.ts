/**
 * Service worker: keeps declarativeNetRequest rules in sync with local storage
 * and reflects state in the toolbar badge. No message passing needed — the UI
 * writes storage, we react (the pattern proven in xDebugHelperPro).
 */
import { getStorageData, onStorageChanged } from './utils/storage';
import { ApplyResult, applyRules, countActiveHeaderOps } from './utils/dnr';
import { StorageData } from './types';

const ACTIVE_COLOR = '#4E5BF6'; // brand accent
const IDLE_COLOR = '#6B6E7A';
const ERROR_COLOR = '#E5484D'; // danger

async function updateBadge(data: StorageData, result?: ApplyResult): Promise<void> {
  const count = countActiveHeaderOps(data);
  try {
    if (result && result.failed > 0) {
      // Some rules were rejected (e.g. an invalid URL regex) — flag it visibly.
      await chrome.action.setBadgeBackgroundColor({ color: ERROR_COLOR });
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setTitle({
        title: `Overhead — ${result.failed} rule${result.failed === 1 ? '' : 's'} invalid (check your URL regex)`,
      });
      return;
    }
    await chrome.action.setBadgeBackgroundColor({
      color: data.enabled && count > 0 ? ACTIVE_COLOR : IDLE_COLOR,
    });
    await chrome.action.setBadgeText({
      text: data.enabled && count > 0 ? String(count) : '',
    });
    await chrome.action.setTitle({
      title:
        data.enabled && count > 0
          ? `Overhead — ${count} header${count === 1 ? '' : 's'} active`
          : 'Overhead — no headers active',
    });
  } catch (error) {
    console.error('[Overhead] Failed to update badge:', error);
  }
}

async function sync(): Promise<void> {
  const data = await getStorageData();
  const result = await applyRules(data);
  await updateBadge(data, result);
}

// React to any config change.
onStorageChanged((data) => {
  applyRules(data)
    .then((result) => updateBadge(data, result))
    .catch((e) => console.error('[Overhead] applyRules failed:', e));
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
