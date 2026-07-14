/**
 * Dev-only mock of the chrome.* APIs so the real popup/options components render
 * in a normal browser tab (outside an extension). NOT part of the shipped build
 * — this folder lives outside src/ and is excluded from tsc.
 */
const KEY = 'overhead';

const store: Record<string, unknown> = {
  [KEY]: {
    version: 1,
    enabled: true,
    theme: 'dark',
    groups: [
      {
        id: 'g-live',
        name: 'LIVE',
        color: '#E5484D',
        enabled: true,
        exclusiveTag: '',
        condition: { matchType: 'urlFilter', pattern: 'https://api.myapp.com/*' },
        headers: [
          { id: 'h1', target: 'request', op: 'set', name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc34', enabled: true, label: 'Prod API token' },
          { id: 'h2', target: 'request', op: 'set', name: 'X-Env', value: 'live', enabled: true },
          { id: 'h3', target: 'response', op: 'set', name: 'X-Cache-Status', value: 'BYPASS', enabled: true },
        ],
      },
      {
        id: 'g-dev',
        name: 'DEV',
        color: '#30A46C',
        enabled: true,
        exclusiveTag: '',
        condition: { matchType: 'all', pattern: '' },
        headers: [
          { id: 'h4', target: 'request', op: 'set', name: 'X-Env', value: 'dev', enabled: true },
          { id: 'h5', target: 'request', op: 'set', name: 'X-Debug', value: 'true', enabled: true },
        ],
      },
      {
        id: 'g-staging',
        name: 'Staging',
        color: '#F5A623',
        enabled: false,
        exclusiveTag: '',
        condition: { matchType: 'all', pattern: '' },
        headers: [{ id: 'h6', target: 'request', op: 'set', name: 'X-Env', value: 'staging', enabled: true }],
      },
      {
        id: 'g-preview',
        name: 'Preview',
        color: '#8E4EC6',
        enabled: false,
        exclusiveTag: '',
        condition: { matchType: 'all', pattern: '' },
        headers: [{ id: 'h7', target: 'request', op: 'set', name: 'X-Env', value: 'preview', enabled: true }],
      },
    ],
  },
};

const changeListeners: Array<(changes: unknown, area: string) => void> = [];

(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: {
    id: 'preview',
    getManifest: () => ({ version: '0.1.2' }),
    openOptionsPage: () =>
      document.getElementById('options-anchor')?.scrollIntoView({ behavior: 'smooth' }),
  },
  storage: {
    local: {
      get(keys: unknown, cb: (result: Record<string, unknown>) => void) {
        let result: Record<string, unknown> = {};
        if (typeof keys === 'string') result = { [keys]: store[keys] };
        else if (Array.isArray(keys)) keys.forEach((k) => (result[k] = store[k]));
        else if (keys == null) result = { ...store };
        else result = { ...store };
        cb(result);
      },
      set(items: Record<string, unknown>, cb?: () => void) {
        Object.assign(store, items);
        const changes: Record<string, { newValue: unknown }> = {};
        for (const k of Object.keys(items)) changes[k] = { newValue: items[k] };
        changeListeners.forEach((l) => l(changes, 'local'));
        cb && cb();
      },
    },
    onChanged: { addListener: (cb: (changes: unknown, area: string) => void) => changeListeners.push(cb) },
  },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {}, setTitle() {} },
};
