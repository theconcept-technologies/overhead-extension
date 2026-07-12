/**
 * Service worker: keeps declarativeNetRequest rules in sync with local storage
 * and reflects state in the toolbar badge. No message passing needed — the UI
 * writes storage, we react (the pattern proven in xDebugHelperPro).
 */
import { getStorageData, onStorageChanged } from './utils/storage';
import { applyRules, countActiveHeaderOps } from './utils/dnr';
import { StorageData } from './types';

const ACTIVE_COLOR = '#4E5BF6'; // brand accent
const IDLE_COLOR = '#6B6E7A';

async function updateBadge(data: StorageData): Promise<void> {
  const count = countActiveHeaderOps(data);
  try {
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
  await applyRules(data);
  await updateBadge(data);
}

// React to any config change.
onStorageChanged((data) => {
  applyRules(data).catch((e) => console.error('[Overhead] applyRules failed:', e));
  updateBadge(data).catch((e) => console.error('[Overhead] updateBadge failed:', e));
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
