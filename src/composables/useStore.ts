/**
 * Shared reactive store for the popup and options pages.
 *
 * Each page loads storage once into a local reactive `state`, edits mutate it,
 * and a debounced deep-watcher writes back. The background worker reacts to the
 * write to (re)apply DNR rules. We deliberately don't live-reload from
 * storage.onChanged inside an editor to avoid clobbering in-progress input.
 */
import { reactive, ref, watch } from 'vue';
import { HeaderGroup, HeaderRule, StorageData, ThemePreference } from '../types';
import { createGroup, createHeaderRule } from '../utils/factory';
import { getStorageData, setStorageData } from '../utils/storage';

const state = reactive<StorageData>({
  version: 1,
  enabled: true,
  groups: [],
  theme: 'system',
});

const loaded = ref(false);
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    // Clone into a plain object; reactive proxies can't be structured-cloned by
    // the storage API.
    setStorageData(JSON.parse(JSON.stringify(state))).catch((e) =>
      console.error('[Overhead] persist failed:', e)
    );
  }, 200);
}

export function useStore() {
  async function load() {
    const data = await getStorageData();
    Object.assign(state, data);
    loaded.value = true;
    // Persist automatically on any deep change once loaded.
    watch(state, schedulePersist, { deep: true });
  }

  function toggleMaster(enabled: boolean) {
    state.enabled = enabled;
  }

  function toggleGroup(groupId: string, enabled: boolean) {
    const g = state.groups.find((x) => x.id === groupId);
    if (!g) return;
    g.enabled = enabled;
    if (enabled && g.exclusiveTag) {
      for (const other of state.groups) {
        if (other.id !== g.id && other.exclusiveTag === g.exclusiveTag) {
          other.enabled = false;
        }
      }
    }
  }

  function addGroup(): HeaderGroup {
    const g = createGroup(state.groups.length, { enabled: false });
    state.groups.push(g);
    return g;
  }

  function removeGroup(groupId: string) {
    const i = state.groups.findIndex((g) => g.id === groupId);
    if (i >= 0) state.groups.splice(i, 1);
  }

  /** Clone a group (fresh ids, disabled, inserted right after the original). */
  function duplicateGroup(groupId: string): HeaderGroup | undefined {
    const i = state.groups.findIndex((g) => g.id === groupId);
    if (i < 0) return undefined;
    const g = state.groups[i];
    const copy = createGroup(state.groups.length, {
      name: `${g.name} copy`,
      color: g.color,
      enabled: false,
      exclusiveTag: g.exclusiveTag,
      condition: JSON.parse(JSON.stringify(g.condition)),
      headers: g.headers.map((h) =>
        createHeaderRule({ target: h.target, op: h.op, name: h.name, value: h.value, enabled: h.enabled })
      ),
    });
    state.groups.splice(i + 1, 0, copy);
    return copy;
  }

  /** Toggle every header in a group on or off at once. */
  function setAllHeaders(groupId: string, enabled: boolean) {
    const g = state.groups.find((x) => x.id === groupId);
    if (g) g.headers.forEach((h) => (h.enabled = enabled));
  }

  function addHeader(groupId: string, target: HeaderRule['target'] = 'request') {
    const g = state.groups.find((x) => x.id === groupId);
    if (g) g.headers.push(createHeaderRule({ target }));
  }

  /** Insert a header from a template/preset into a group. */
  function insertHeader(groupId: string, partial: Partial<HeaderRule>) {
    const g = state.groups.find((x) => x.id === groupId);
    if (g) g.headers.push(createHeaderRule(partial));
  }

  function removeHeader(groupId: string, headerId: string) {
    const g = state.groups.find((x) => x.id === groupId);
    if (!g) return;
    const i = g.headers.findIndex((h) => h.id === headerId);
    if (i >= 0) g.headers.splice(i, 1);
  }

  function replaceGroups(groups: HeaderGroup[]) {
    state.groups.push(...groups);
  }

  function setTheme(theme: ThemePreference) {
    state.theme = theme;
  }

  return {
    state,
    loaded,
    load,
    toggleMaster,
    toggleGroup,
    addGroup,
    removeGroup,
    duplicateGroup,
    addHeader,
    insertHeader,
    removeHeader,
    setAllHeaders,
    replaceGroups,
    setTheme,
  };
}
