<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from '../composables/useStore';
import { applyTheme } from '../composables/useTheme';
import { APP, appVersion } from '../config';
import { LocalePref, t } from '../i18n';
import { HeaderRule, MatchType, ResourceType, ThemePreference } from '../types';
import { validateRegex } from '../utils/dnr';
import { canAppend, isSensitiveHeader } from '../utils/headers';
import { COMMON_HEADER_NAMES, HEADER_TEMPLATES, HeaderTemplate } from '../utils/headerCatalog';
import { exportGroups, parseImport } from '../utils/importExport';
import MarkLogo from './MarkLogo.vue';
import StackGame from './StackGame.vue';

const {
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
  setLocale,
} = useStore();

const templatesOpen = ref(false);
const version = appVersion();

/** Close the full editor tab (the quick popup lives on the toolbar icon). */
function closeEditor() {
  try {
    const c = (globalThis as { chrome?: typeof chrome }).chrome;
    if (c?.tabs?.getCurrent) {
      c.tabs.getCurrent((t) => (t?.id != null ? c.tabs.remove(t.id) : window.close()));
      return;
    }
  } catch {
    /* fall through */
  }
  window.close();
}
function onTemplate(t: HeaderTemplate) {
  if (!selected.value) return;
  insertHeader(selected.value.id, { target: t.target, op: t.op, name: t.name, value: t.value });
  templatesOpen.value = false;
}

const selectedId = ref<string | null>(null);
const importOpen = ref(false);
const importText = ref('');
const importMsg = ref('');
const importOk = ref(false);
const exportOpen = ref(false);
const exportText = ref('');

const RESOURCE_TYPES: ResourceType[] = [
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

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const LOCALES: LocalePref[] = ['en', 'de'];
const MATCH_TYPES: MatchType[] = ['all', 'urlFilter', 'regexFilter', 'urls'];

function themeLabel(th: ThemePreference) {
  return th === 'light' ? t('themeLight') : th === 'dark' ? t('themeDark') : t('themeSystem');
}
function localeLabel(l: LocalePref) {
  return l === 'en' ? 'English' : l === 'de' ? 'Deutsch' : t('langSystem');
}
function matchTypeLabel(m: MatchType) {
  return m === 'all'
    ? t('allUrls')
    : m === 'urlFilter'
      ? t('urlWildcard')
      : m === 'urls'
        ? t('urlList')
        : t('urlRegex');
}

function setMatchType(m: MatchType) {
  const g = selected.value;
  if (!g) return;
  g.condition.matchType = m;
  if (m === 'urls' && (!g.condition.patterns || g.condition.patterns.length === 0)) {
    g.condition.patterns = [''];
  }
}
function addUrl() {
  const g = selected.value;
  if (!g) return;
  if (!g.condition.patterns) g.condition.patterns = [];
  g.condition.patterns.push('');
}
function removeUrl(i: number) {
  const g = selected.value;
  if (!g?.condition.patterns) return;
  g.condition.patterns.splice(i, 1);
  if (g.condition.patterns.length === 0) g.condition.patterns.push('');
}

// Easter egg: Konami code (↑↑↓↓←→←→ b a) or clicking the logo 7× unlocks the
// equalizer dance + the Stack game.
const dancing = ref(false);
const gameOpen = ref(false);
const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];
let konamiProgress = 0;
let logoClicks = 0;
let logoTimer: ReturnType<typeof setTimeout> | undefined;

function unlock() {
  dancing.value = true;
  gameOpen.value = true;
  setTimeout(() => (dancing.value = false), 1800);
}

function onKey(e: KeyboardEvent) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiProgress = k === KONAMI[konamiProgress] ? konamiProgress + 1 : k === KONAMI[0] ? 1 : 0;
  if (konamiProgress === KONAMI.length) {
    konamiProgress = 0;
    unlock();
  }
}

function onLogoClick() {
  logoClicks += 1;
  if (logoTimer) clearTimeout(logoTimer);
  logoTimer = setTimeout(() => (logoClicks = 0), 1200);
  if (logoClicks >= 7) {
    logoClicks = 0;
    unlock();
  }
}

onMounted(async () => {
  await load();
  applyTheme(() => state.theme);
  if (state.groups.length) selectedId.value = state.groups[0].id;
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => window.removeEventListener('keydown', onKey));

const selected = computed(() => state.groups.find((g) => g.id === selectedId.value) ?? null);

const sensitiveInSelected = computed(
  () =>
    !!selected.value &&
    selected.value.headers.some((h) => h.enabled && isSensitiveHeader(h.name))
);

// Validate the URL regex against Chrome's DNR engine, live.
const regexError = ref<string | null>(null);
watch(
  () => [selected.value?.condition.matchType, selected.value?.condition.pattern],
  async () => {
    const g = selected.value;
    if (!g || g.condition.matchType !== 'regexFilter' || !g.condition.pattern.trim()) {
      regexError.value = null;
      return;
    }
    regexError.value = await validateRegex(g.condition.pattern.trim());
  },
  { immediate: true }
);

function onAddGroup() {
  const g = addGroup();
  selectedId.value = g.id;
}

function onRemoveGroup(id: string) {
  removeGroup(id);
  if (selectedId.value === id) {
    selectedId.value = state.groups[0]?.id ?? null;
  }
}

function onDuplicate(id: string) {
  const copy = duplicateGroup(id);
  if (copy) selectedId.value = copy.id;
}

function appendInvalid(h: HeaderRule): boolean {
  return h.op === 'append' && !!h.name.trim() && !canAppend(h.name, h.target);
}

function toggleResourceType(rt: ResourceType) {
  const g = selected.value;
  if (!g) return;
  const list = g.condition.resourceTypes ?? [];
  const i = list.indexOf(rt);
  if (i >= 0) list.splice(i, 1);
  else list.push(rt);
  g.condition.resourceTypes = list.length ? list : undefined;
}

function openExport() {
  exportText.value = exportGroups(JSON.parse(JSON.stringify(state)));
  exportOpen.value = true;
}

function downloadExport() {
  const blob = new Blob([exportText.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'overhead-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function copyExport() {
  try {
    await navigator.clipboard.writeText(exportText.value);
  } catch {
    /* clipboard may be unavailable; textarea is selectable as fallback */
  }
}

function runImport() {
  const result = parseImport(importText.value);
  if (!result.ok) {
    importOk.value = false;
    importMsg.value = result.error;
    return;
  }
  replaceGroups(result.groups);
  importOk.value = true;
  importMsg.value = t('imported', { n: result.groups.length, source: result.source });
  importText.value = '';
  if (!selectedId.value && state.groups.length) selectedId.value = state.groups[0].id;
}

function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    importText.value = String(reader.result ?? '');
    runImport();
  };
  reader.readAsText(file);
}
</script>

<template>
  <div
    v-if="loaded"
    class="h-screen flex flex-col overflow-hidden bg-canvas-light dark:bg-canvas-dark text-ink-light dark:text-ink-dark"
  >
    <!-- Top bar -->
    <header
      class="shrink-0 z-10 flex items-center justify-between px-6 py-3 border-b border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark"
    >
      <div class="flex items-center gap-3">
        <button class="flex items-center rounded-md focus:outline-none" title="Overhead" @click="onLogoClick">
          <MarkLogo :size="26" :dancing="dancing" />
        </button>
        <div class="flex flex-col leading-tight">
          <span class="font-bold tracking-tight">{{ APP.name }}</span>
          <span class="text-[11.5px] text-muted-light dark:text-muted-dark">{{ t('tagline') }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- language segmented -->
        <div class="flex rounded-lg border border-hairline-light dark:border-[#2E3039] p-0.5" :title="t('langLabel')">
          <button
            v-for="l in LOCALES"
            :key="l"
            class="text-xs px-2.5 py-1 rounded-md transition-colors"
            :class="
              state.locale === l
                ? 'bg-hairline-light dark:bg-hairline-dark font-semibold'
                : 'text-muted-light dark:text-muted-dark'
            "
            @click="setLocale(l)"
          >
            {{ l === 'system' ? '🌐' : localeLabel(l) }}
          </button>
        </div>
        <!-- theme segmented -->
        <div class="flex rounded-lg border border-hairline-light dark:border-[#2E3039] p-0.5">
          <button
            v-for="th in THEMES"
            :key="th"
            class="text-xs px-2.5 py-1 rounded-md transition-colors"
            :class="
              state.theme === th
                ? 'bg-hairline-light dark:bg-hairline-dark font-semibold'
                : 'text-muted-light dark:text-muted-dark'
            "
            @click="setTheme(th)"
          >
            {{ themeLabel(th) }}
          </button>
        </div>
        <button
          class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand"
          @click="importOpen = !importOpen"
        >
          {{ t('import') }}
        </button>
        <button
          class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand"
          @click="openExport"
        >
          {{ t('export') }}
        </button>
        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
          <span class="text-xs text-muted-light dark:text-muted-dark">{{ state.enabled ? t('enabled') : t('disabled') }}</span>
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="state.enabled"
            @change="toggleMaster(($event.target as HTMLInputElement).checked)"
          />
          <span
            class="w-10 h-[23px] rounded-full bg-hairline-light dark:bg-[#2E3039] peer-checked:bg-brand relative transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-[17px] after:h-[17px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[17px]"
          ></span>
        </label>
        <button
          class="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover"
          title="Close the editor — the quick popup is on your toolbar icon"
          @click="closeEditor"
        >
          {{ t('done') }}
        </button>
      </div>
    </header>

    <!-- Import panel -->
    <div
      v-if="importOpen"
      class="shrink-0 px-6 py-4 border-b border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark"
    >
      <div class="text-sm font-semibold mb-2">{{ t('importConfig') }}</div>
      <p class="text-xs text-muted-light dark:text-muted-dark mb-2">
        {{ t('importHint') }}
      </p>
      <textarea
        v-model="importText"
        rows="5"
        placeholder="Paste JSON here…"
        class="w-full text-xs font-mono p-2.5 rounded-lg border border-hairline-light dark:border-[#2E3039] bg-canvas-light dark:bg-canvas-dark outline-none focus:border-brand"
      ></textarea>
      <div class="flex items-center gap-3 mt-2">
        <button class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover" @click="runImport">{{ t('import') }}</button>
        <input type="file" accept="application/json,.json" class="text-xs" @change="onImportFile" />
        <span class="text-xs" :class="importOk ? 'text-success' : 'text-danger'">{{ importMsg }}</span>
      </div>
    </div>

    <!-- Export panel -->
    <div
      v-if="exportOpen"
      class="shrink-0 px-6 py-4 border-b border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold">{{ t('exportConfig') }}</span>
        <button class="text-xs text-muted-light dark:text-muted-dark hover:text-brand" @click="exportOpen = false">{{ t('close') }}</button>
      </div>
      <textarea
        :value="exportText"
        rows="6"
        readonly
        class="w-full text-xs font-mono p-2.5 rounded-lg border border-hairline-light dark:border-[#2E3039] bg-canvas-light dark:bg-canvas-dark outline-none"
      ></textarea>
      <div class="flex gap-3 mt-2">
        <button class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-hover" @click="downloadExport">{{ t('download') }}</button>
        <button class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039]" @click="copyExport">{{ t('copy') }}</button>
      </div>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Sidebar -->
      <aside class="w-[236px] shrink-0 border-r border-hairline-light dark:border-hairline-dark p-3 overflow-y-auto">
        <div class="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-light dark:text-muted-dark px-2.5 pb-2">
          {{ t('environments') }}
        </div>
        <ul class="space-y-1">
          <li v-for="g in state.groups" :key="g.id">
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left border transition-colors"
              :class="
                selectedId === g.id
                  ? 'bg-brand-tint dark:bg-[#1C2140] border-brand/40 dark:border-[#2E376B]'
                  : 'border-transparent hover:bg-hairline-light/60 dark:hover:bg-[#1B1C23]'
              "
              @click="selectedId = g.id"
            >
              <span class="w-[9px] h-[9px] rounded-full shrink-0" :style="{ backgroundColor: g.color }"></span>
              <span class="truncate flex-1 font-medium" :class="!g.enabled && 'text-muted-light dark:text-muted-dark'">{{ g.name || 'Untitled' }}</span>
              <span
                class="w-[7px] h-[7px] rounded-full shrink-0"
                :style="{ backgroundColor: g.enabled ? '#30A46C' : '#3A3C46' }"
                :title="g.enabled ? 'Active' : 'Inactive'"
              ></span>
            </button>
          </li>
        </ul>
        <button
          class="w-full mt-2 px-2.5 py-2 rounded-lg text-sm font-semibold text-muted-light dark:text-muted-dark border border-dashed border-hairline-light dark:border-[#3A3C46] hover:text-brand hover:border-brand"
          @click="onAddGroup"
        >
          {{ t('addEnvironment') }}
        </button>

        <!-- Support / donations -->
        <div class="mt-5 rounded-xl border border-hairline-light dark:border-hairline-dark p-3">
          <div class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-light dark:text-muted-dark mb-1.5">
            {{ t('supportUs') }}
          </div>
          <p class="text-[11.5px] text-muted-light dark:text-muted-dark leading-relaxed mb-2.5">
            {{ t('supportBody') }}
          </p>
          <div class="flex flex-col gap-2">
            <a
              :href="APP.donate.buyMeACoffee"
              target="_blank"
              rel="noopener"
              class="text-center text-xs font-semibold px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover"
              >☕ Buy Me a Coffee</a
            >
            <a
              :href="APP.donate.githubSponsors"
              target="_blank"
              rel="noopener"
              class="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand"
              >💜 GitHub Sponsors</a
            >
          </div>
          <p class="mt-2.5 text-[10.5px] leading-relaxed text-muted-light dark:text-muted-dark">
            {{ t('everyBit', { company: APP.company }) }}
          </p>
        </div>
      </aside>

      <!-- Editor -->
      <main class="flex-1 min-w-0 p-6 max-w-4xl overflow-y-auto">
        <div v-if="!selected" class="text-sm text-muted-light dark:text-muted-dark py-24 text-center">
          {{ t('selectEnv') }}
        </div>

        <div v-else class="space-y-5">
          <!-- Group meta -->
          <div class="flex items-center gap-3.5">
            <input
              type="color"
              v-model="selected.color"
              class="w-[34px] h-[34px] rounded-lg border border-hairline-light dark:border-[#2E3039] bg-transparent cursor-pointer p-0"
              title="Environment color"
            />
            <input
              v-model="selected.name"
              placeholder="Environment name (e.g. LIVE)"
              class="flex-1 text-[22px] font-bold tracking-tight bg-transparent border-b border-transparent hover:border-hairline-light dark:hover:border-hairline-dark focus:border-brand outline-none py-0.5"
            />
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" class="accent-brand w-4 h-4" :checked="selected.enabled" @change="toggleGroup(selected.id, ($event.target as HTMLInputElement).checked)" />
              {{ t('active2') }}
            </label>
            <button class="text-[13px] text-muted-light dark:text-muted-dark font-medium hover:text-brand" @click="onDuplicate(selected.id)">{{ t('duplicate') }}</button>
            <button class="text-[13px] text-danger font-medium hover:underline" @click="onRemoveGroup(selected.id)">{{ t('del') }}</button>
          </div>

          <!-- Exclusivity -->
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <label class="text-muted-light dark:text-muted-dark w-[130px]">{{ t('exclusiveGroup') }}</label>
            <input
              v-model="selected.exclusiveTag"
              placeholder="e.g. environment"
              class="w-56 text-[13px] font-mono bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-[#2E3039] rounded-lg px-3 py-2 outline-none focus:border-brand"
            />
            <span class="text-xs text-muted-light dark:text-muted-dark">{{ t('exclusiveHint') }}</span>
          </div>

          <!-- Condition -->
          <div class="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4">
            <div class="text-[13px] font-bold mb-3.5">{{ t('applyTo') }}</div>
            <div class="flex items-center gap-3 flex-wrap">
              <div class="flex rounded-lg border border-hairline-light dark:border-[#2E3039] p-0.5">
                <button
                  v-for="m in MATCH_TYPES"
                  :key="m"
                  class="text-[12.5px] px-3 py-1.5 rounded-md transition-colors"
                  :class="
                    selected.condition.matchType === m
                      ? 'bg-hairline-light dark:bg-hairline-dark font-semibold'
                      : 'text-muted-light dark:text-muted-dark'
                  "
                  @click="setMatchType(m)"
                >
                  {{ matchTypeLabel(m) }}
                </button>
              </div>
              <input
                v-if="selected.condition.matchType === 'urlFilter' || selected.condition.matchType === 'regexFilter'"
                v-model="selected.condition.pattern"
                :placeholder="selected.condition.matchType === 'regexFilter' ? '^https://api\\.example\\.com/.*' : 'https://api.myapp.com/*'"
                class="flex-1 min-w-[220px] text-[13px] font-mono bg-canvas-light dark:bg-canvas-dark border rounded-lg px-3 py-2 outline-none focus:border-brand"
                :class="regexError && selected.condition.matchType === 'regexFilter' ? 'border-danger' : 'border-hairline-light dark:border-[#2E3039]'"
              />
            </div>

            <!-- URL list mode: multiple wildcard URLs -->
            <div v-if="selected.condition.matchType === 'urls'" class="mt-3 space-y-2">
              <div
                v-for="(u, i) in (selected.condition.patterns ?? [])"
                :key="i"
                class="flex items-center gap-2"
              >
                <input
                  v-model="selected.condition.patterns[i]"
                  placeholder="https://api.example.com/*"
                  class="flex-1 min-w-0 text-[13px] font-mono bg-canvas-light dark:bg-canvas-dark border border-hairline-light dark:border-[#2E3039] rounded-lg px-3 py-2 outline-none focus:border-brand"
                />
                <button
                  class="shrink-0 text-muted-light dark:text-muted-dark hover:text-danger px-1.5 text-sm"
                  title="Remove"
                  @click="removeUrl(i)"
                >✕</button>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <button
                  class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-hairline-light dark:border-[#3A3C46] text-muted-light dark:text-muted-dark hover:text-brand hover:border-brand"
                  @click="addUrl"
                >
                  {{ t('addUrl') }}
                </button>
                <span class="text-[11.5px] text-muted-light dark:text-muted-dark">{{ t('urlsHint') }}</span>
              </div>
            </div>
            <p
              v-if="regexError && selected.condition.matchType === 'regexFilter'"
              class="mt-2 text-[11.5px] text-danger"
            >
              {{ t('invalidRegex', { reason: regexError ?? '' }) }}
            </p>
            <details class="mt-3">
              <summary class="text-[12.5px] font-semibold text-brand dark:text-[#8FB4FF] cursor-pointer">{{ t('advancedResourceTypes') }}</summary>
              <div class="flex flex-wrap gap-2 mt-3">
                <label
                  v-for="rt in RESOURCE_TYPES"
                  :key="rt"
                  class="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors"
                  :class="
                    (selected.condition.resourceTypes ?? []).includes(rt)
                      ? 'bg-brand-tint dark:bg-[#1C2140] border-brand/50 dark:border-[#2E376B] text-brand dark:text-[#8FB4FF]'
                      : 'bg-canvas-light dark:bg-canvas-dark border-hairline-light dark:border-[#2E3039] text-muted-light dark:text-muted-dark'
                  "
                >
                  <input type="checkbox" class="sr-only" :checked="(selected.condition.resourceTypes ?? []).includes(rt)" @change="toggleResourceType(rt)" />
                  {{ rt }}
                </label>
                <span class="text-[11.5px] text-muted-light dark:text-muted-dark self-center">{{ t('noneSelected') }}</span>
              </div>
            </details>
          </div>

          <!-- Sensitive warning -->
          <div
            v-if="sensitiveInSelected"
            class="flex items-start gap-3 rounded-xl px-4 py-3.5 bg-warning/10 border border-warning/40"
          >
            <span class="text-warning text-base leading-tight shrink-0">⚠</span>
            <div>
              <div class="text-[13px] font-semibold text-warning">{{ t('credTitle') }}</div>
              <div class="text-[12.5px] text-muted-light dark:text-muted-dark leading-relaxed">
                {{ t('credBody') }}
              </div>
            </div>
          </div>

          <!-- Headers -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-[13px] font-bold">{{ t('headers') }}</span>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <button
                    class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand"
                    @click="templatesOpen = !templatesOpen"
                  >
                    {{ t('templates') }}
                  </button>
                  <div
                    v-if="templatesOpen"
                    class="absolute right-0 mt-1 z-20 w-64 rounded-lg border border-hairline-light dark:border-[#2E3039] bg-surface-light dark:bg-surface-dark shadow-xl p-1"
                  >
                    <button
                      v-for="t in HEADER_TEMPLATES"
                      :key="t.label"
                      class="flex items-baseline gap-2 w-full text-left text-xs px-2.5 py-2 rounded hover:bg-brand-tint dark:hover:bg-[#1C2140]"
                      @click="onTemplate(t)"
                    >
                      <span class="font-medium">{{ t.label }}</span>
                      <span class="font-mono text-[10px] text-muted-light dark:text-muted-dark truncate ml-auto">{{ t.name }}</span>
                    </button>
                  </div>
                </div>
                <button
                  v-if="selected.headers.length"
                  class="text-[11px] text-muted-light dark:text-muted-dark hover:text-brand px-1"
                  @click="setAllHeaders(selected.id, !selected.headers.every((h) => h.enabled))"
                >
                  {{ selected.headers.every((h) => h.enabled) ? t('disableAll') : t('enableAll') }}
                </button>
                <button class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand" @click="addHeader(selected.id, 'request')">{{ t('addRequest') }}</button>
                <button class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-hairline-light dark:border-[#2E3039] hover:border-brand" @click="addHeader(selected.id, 'response')">{{ t('addResponse') }}</button>
              </div>
            </div>

            <div v-if="selected.headers.length === 0" class="text-xs text-muted-light dark:text-muted-dark py-5 text-center border border-dashed border-hairline-light dark:border-hairline-dark rounded-xl">
              {{ t('noHeadersLong') }}
            </div>

            <div v-for="h in selected.headers" :key="h.id" class="flex items-center gap-2 mb-2">
              <input type="checkbox" v-model="h.enabled" class="shrink-0 accent-brand w-4 h-4" title="Enable this header" />
              <input
                v-model="h.label"
                :placeholder="t('labelOptional')"
                title="Display-only label — never sent"
                class="w-36 shrink-0 text-[13px] bg-transparent border border-hairline-light dark:border-[#2E3039] rounded-lg px-2.5 py-2 outline-none focus:border-brand placeholder:text-muted-light/70 dark:placeholder:text-muted-dark/70"
              />
              <select v-model="h.target" class="text-xs font-semibold bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-[#2E3039] rounded-lg px-2 py-2 outline-none">
                <option value="request">REQ</option>
                <option value="response">RES</option>
              </select>
              <select v-model="h.op" class="text-xs bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-[#2E3039] rounded-lg px-2 py-2 outline-none">
                <option value="set">set</option>
                <option value="append">append</option>
                <option value="remove">remove</option>
              </select>
              <input
                v-model="h.name"
                list="oh-header-names"
                placeholder="Header-Name"
                class="w-48 text-[13px] font-mono bg-canvas-light dark:bg-canvas-dark border rounded-lg px-3 py-2 outline-none focus:border-brand"
                :class="isSensitiveHeader(h.name) ? 'border-warning/60' : 'border-hairline-light dark:border-[#2E3039]'"
              />
              <input
                v-if="h.op !== 'remove'"
                v-model="h.value"
                placeholder="value"
                class="flex-1 text-[13px] font-mono bg-canvas-light dark:bg-canvas-dark border border-hairline-light dark:border-[#2E3039] rounded-lg px-3 py-2 outline-none focus:border-brand"
              />
              <span v-else class="flex-1 text-xs text-muted-light dark:text-muted-dark italic px-2">{{ t('removesHeader') }}</span>
              <button class="text-muted-light dark:text-muted-dark hover:text-danger px-1.5 text-sm" @click="removeHeader(selected.id, h.id)" title="Remove">✕</button>
            </div>

            <!-- append validity hints -->
            <template v-for="h in selected.headers" :key="'warn-' + h.id">
              <p v-if="appendInvalid(h)" class="text-[11.5px] text-warning ml-6 mt-1">
                {{ t('cantAppend', { name: h.name }) }}
              </p>
            </template>

            <!-- Always-visible add affordance below the last row -->
            <button
              class="w-full mt-2 py-2 rounded-lg border border-dashed border-hairline-light dark:border-[#3A3C46] text-[13px] font-medium text-muted-light dark:text-muted-dark hover:text-brand hover:border-brand transition-colors"
              @click="addHeader(selected.id, 'request')"
            >
              {{ t('addHeader') }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Footer — product + company (always visible) -->
    <footer
      class="shrink-0 z-10 flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark text-[11.5px] text-muted-light dark:text-muted-dark"
    >
      <span>
        {{ APP.name }}<span v-if="version" class="opacity-70"> v{{ version }}</span> ·
        <a
          :href="APP.homepage"
          target="_blank"
          rel="noopener"
          class="font-semibold text-ink-light dark:text-ink-dark hover:text-brand"
          >{{ APP.company }}</a
        >
      </span>
      <span class="flex items-center gap-4">
        <a :href="APP.repo" target="_blank" rel="noopener" class="hover:text-brand">GitHub</a>
        <a :href="`${APP.repo}/blob/main/PRIVACY.md`" target="_blank" rel="noopener" class="hover:text-brand">{{ t('privacy') }}</a>
      </span>
    </footer>

    <!-- Shared autocomplete source -->
    <datalist id="oh-header-names">
      <option v-for="n in COMMON_HEADER_NAMES" :key="n" :value="n" />
    </datalist>

    <!-- Easter-egg game overlay -->
    <div
      v-if="gameOpen"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#06070B]/85 backdrop-blur-sm p-4"
    >
      <div class="w-[420px] max-w-full mb-3 flex items-center justify-between text-white">
        <div>
          <div class="font-mono text-[10px] font-bold tracking-[0.2em] text-[#8FB4FF]">{{ t('arcadeHiddenProtocol') }}</div>
          <div class="mt-1 text-sm font-bold tracking-tight">{{ t('arcadeSession') }}</div>
        </div>
        <button
          class="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/65 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          :aria-label="t('close')"
          @click="gameOpen = false"
        >
          ×
        </button>
      </div>
      <StackGame large />
      <div class="mt-3 flex items-center gap-2 font-mono text-[9px] font-semibold tracking-wider text-white/45">
        <span class="rounded border border-white/15 bg-white/5 px-2 py-1 text-white/70">SPACE</span>
        <span>{{ t('arcadeDropHeader') }}</span>
        <span class="mx-1 text-white/20">//</span>
        <span class="rounded border border-white/15 bg-white/5 px-2 py-1 text-white/70">ENTER</span>
        <span>{{ t('arcadeRetry') }}</span>
      </div>
    </div>
  </div>
</template>
