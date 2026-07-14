import browser from 'webextension-polyfill';
import { APP } from '../config';
import { HeaderGroup, SCHEMA_VERSION, StorageData, ThemePreference } from '../types';
import { createGroup, createHeaderRule } from './factory';

const KEY = APP.storageKey;

function seedData(): StorageData {
  // A friendly first-run example: a LIVE / DEV pair that are mutually exclusive.
  const live = createGroup(0, {
    name: 'LIVE',
    exclusiveTag: 'env',
    condition: { matchType: 'all', pattern: '' },
    headers: [
      createHeaderRule({ target: 'request', op: 'set', name: 'X-Environment', value: 'live', enabled: true }),
    ],
  });
  const dev = createGroup(1, {
    name: 'DEV',
    enabled: false,
    exclusiveTag: 'env',
    condition: { matchType: 'all', pattern: '' },
    headers: [
      createHeaderRule({ target: 'request', op: 'set', name: 'X-Environment', value: 'dev', enabled: true }),
    ],
  });
  return {
    version: SCHEMA_VERSION,
    enabled: true,
    groups: [live, dev],
    theme: 'system',
    locale: 'en',
  };
}

function migrate(data: StorageData): StorageData {
  // Forward-compatible migrations keyed on data.version go here.
  if (data.version < SCHEMA_VERSION) {
    data = { ...data, version: SCHEMA_VERSION };
  }
  // Older versions used browser auto-detection. English is now the stable
  // default so the UI never mixes languages on first run.
  if (!data.locale || data.locale === 'system') data = { ...data, locale: 'en' };
  return data;
}

export async function getStorageData(): Promise<StorageData> {
  try {
    const result = await browser.storage.local.get(KEY);
    const data = result[KEY] as StorageData | undefined;
    if (!data) {
      const seeded = seedData();
      await browser.storage.local.set({ [KEY]: seeded });
      return seeded;
    }
    return migrate(data);
  } catch (error) {
    console.error('[Overhead] Failed to read storage:', error);
    return seedData();
  }
}

export async function setStorageData(data: StorageData): Promise<void> {
  await browser.storage.local.set({ [KEY]: data });
}

/** Read-modify-write helper that keeps callers concise and consistent. */
export async function updateStorageData(
  mutate: (data: StorageData) => StorageData | void
): Promise<StorageData> {
  const data = await getStorageData();
  const result = mutate(data) ?? data;
  await setStorageData(result);
  return result;
}

export async function setGroups(groups: HeaderGroup[]): Promise<void> {
  await updateStorageData((d) => {
    d.groups = groups;
  });
}

export async function setMasterEnabled(enabled: boolean): Promise<void> {
  await updateStorageData((d) => {
    d.enabled = enabled;
  });
}

export async function setTheme(theme: ThemePreference): Promise<void> {
  await updateStorageData((d) => {
    d.theme = theme;
  });
}

/**
 * Toggle a group on/off, honoring mutual exclusivity: enabling a group with an
 * `exclusiveTag` disables its siblings that share the same tag.
 */
export async function toggleGroup(
  groupId: string,
  enabled: boolean
): Promise<StorageData> {
  return updateStorageData((d) => {
    const target = d.groups.find((g) => g.id === groupId);
    if (!target) return;
    target.enabled = enabled;
    if (enabled && target.exclusiveTag) {
      for (const g of d.groups) {
        if (g.id !== target.id && g.exclusiveTag === target.exclusiveTag) {
          g.enabled = false;
        }
      }
    }
  });
}

/** Listen for storage changes to this extension's single key. */
export function onStorageChanged(cb: (data: StorageData) => void): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]?.newValue) {
      cb(changes[KEY].newValue as StorageData);
    }
  });
}
