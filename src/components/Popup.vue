<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStore } from '../composables/useStore';
import { applyTheme } from '../composables/useTheme';
import { APP, appVersion } from '../config';
import { HeaderOp, HeaderRule } from '../types';
import { isSensitiveHeader } from '../utils/headers';
import { COMMON_HEADER_NAMES, HEADER_TEMPLATES, HeaderTemplate } from '../utils/headerCatalog';
import { recordActivation } from '../utils/sponsorStorage';
import SponsorOverlay from './SponsorOverlay.vue';
import MarkLogo from './MarkLogo.vue';
import StackGame from './StackGame.vue';

const { state, loaded, load, toggleMaster, toggleGroup, addHeader, insertHeader, removeHeader } =
  useStore();
const showSponsor = ref(false);
const templatesForGroup = ref<string | null>(null);
const version = appVersion();

// Easter egg: click the logo 7× to make the bars dance + open the game.
const dancing = ref(false);
const gameOpen = ref(false);
let logoClicks = 0;
let logoTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(async () => {
  await load();
  applyTheme(() => state.theme);
});

const activeGroups = computed(() => state.groups.filter((g) => g.enabled));
const activeCount = computed(() =>
  activeGroups.value.reduce(
    (n, g) => n + g.headers.filter((h) => h.enabled && h.name.trim()).length,
    0
  )
);

async function onChipClick(groupId: string, currentlyEnabled: boolean) {
  toggleGroup(groupId, !currentlyEnabled);
  if (!currentlyEnabled && state.enabled) {
    if (await recordActivation()) showSponsor.value = true;
  }
}

const OPS: HeaderOp[] = ['set', 'append', 'remove'];
function opLabel(op: HeaderOp) {
  return op === 'append' ? 'app' : op === 'remove' ? 'rm' : 'set';
}
function toggleTarget(h: HeaderRule) {
  h.target = h.target === 'request' ? 'response' : 'request';
}
function cycleOp(h: HeaderRule) {
  h.op = OPS[(OPS.indexOf(h.op) + 1) % OPS.length];
}
function onTemplate(groupId: string, t: HeaderTemplate) {
  insertHeader(groupId, { target: t.target, op: t.op, name: t.name, value: t.value });
  templatesForGroup.value = null;
}

function onLogoClick() {
  logoClicks += 1;
  if (logoTimer) clearTimeout(logoTimer);
  logoTimer = setTimeout(() => (logoClicks = 0), 1200);
  if (logoClicks >= 7) {
    logoClicks = 0;
    dancing.value = true;
    gameOpen.value = true;
    setTimeout(() => (dancing.value = false), 1800);
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function chipText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#3A2A00' : '#ffffff';
}
</script>

<template>
  <div
    v-if="loaded"
    class="relative flex flex-col min-h-[220px] text-sm bg-surface-light dark:bg-surface-dark text-ink-light dark:text-ink-dark oh-fade"
  >
    <!-- Header -->
    <header
      class="flex items-center justify-between px-4 py-3 border-b border-hairline-light dark:border-hairline-dark"
    >
      <div class="flex items-center gap-2.5">
        <button class="flex items-center rounded-md focus:outline-none" title="Overhead" @click="onLogoClick">
          <MarkLogo :size="22" :dancing="dancing" />
        </button>
        <span class="font-bold tracking-tight">{{ APP.name }}</span>
        <span
          v-if="state.enabled && activeCount > 0"
          class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-tint text-brand dark:bg-[#1C2140] dark:text-[#8FB4FF]"
        >
          {{ activeCount }} active
        </span>
      </div>
      <label class="inline-flex items-center gap-2 cursor-pointer select-none" title="Master switch">
        <input
          type="checkbox"
          class="sr-only peer"
          :checked="state.enabled"
          @change="toggleMaster(($event.target as HTMLInputElement).checked)"
        />
        <span
          class="w-9 h-5 rounded-full bg-hairline-light dark:bg-[#2E3039] peer-checked:bg-brand relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
        ></span>
      </label>
    </header>

    <!-- Environment chips -->
    <section v-if="!gameOpen" class="px-4 py-3 border-b border-hairline-light dark:border-hairline-dark">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-light dark:text-muted-dark mb-2">
        Environments — click to activate
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="g in state.groups"
          :key="g.id"
          class="oh-chip px-3 py-1.5 rounded-full text-xs font-semibold border"
          :class="[
            g.enabled
              ? 'border-transparent shadow-sm'
              : 'bg-surface-light dark:bg-[#1B1C23] text-muted-light dark:text-muted-dark border-hairline-light dark:border-[#2E3039]',
            !state.enabled && 'opacity-50',
          ]"
          :style="g.enabled ? { backgroundColor: g.color, color: chipText(g.color) } : {}"
          :disabled="!state.enabled"
          @click="onChipClick(g.id, g.enabled)"
        >
          <span
            v-if="!g.enabled"
            class="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle"
            :style="{ backgroundColor: g.color }"
          ></span>
          {{ g.name || 'Untitled' }}
        </button>
        <button
          class="oh-chip px-3 py-1.5 rounded-full text-xs font-semibold text-muted-light dark:text-muted-dark border border-dashed border-[#C4C7D0] dark:border-[#3A3C46] hover:text-brand hover:border-brand"
          @click="openOptions"
        >
          + New
        </button>
      </div>
    </section>

    <!-- Empty state -->
    <section v-if="!gameOpen && activeGroups.length === 0" class="px-4 py-6 flex-1 flex flex-col items-center justify-center text-center gap-1.5">
      <div class="text-brand dark:text-[#8FB4FF] text-xl leading-none animate-bounce">↑</div>
      <p class="text-sm font-semibold">
        {{ state.groups.length ? 'Click an environment above to start' : 'Create your first environment' }}
      </p>
      <p class="text-xs text-muted-light dark:text-muted-dark max-w-[240px]">
        {{ state.groups.length ? 'Pick LIVE, DEV or another to edit its headers and apply them.' : 'Open the editor to add an environment and its headers.' }}
      </p>
    </section>

    <!-- Active environments → inline header editor -->
    <section v-if="!gameOpen && activeGroups.length" class="px-4 py-3 overflow-y-auto max-h-[380px]">
      <div v-for="g in activeGroups" :key="g.id" class="mb-3">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="relative inline-flex w-2 h-2">
            <span class="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" :style="{ backgroundColor: g.color }"></span>
            <span class="relative inline-flex rounded-full w-2 h-2" :style="{ backgroundColor: g.color }"></span>
          </span>
          <span class="text-xs font-bold">{{ g.name }}</span>
          <span class="ml-auto flex items-center gap-2">
            <button
              class="text-[11px] font-medium text-muted-light dark:text-muted-dark hover:text-brand"
              @click="templatesForGroup = templatesForGroup === g.id ? null : g.id"
            >
              Templates ▾
            </button>
            <button class="text-[11px] font-semibold text-brand dark:text-[#8FB4FF]" @click="addHeader(g.id, 'request')">
              + Add
            </button>
          </span>
        </div>

        <!-- Templates menu -->
        <div
          v-if="templatesForGroup === g.id"
          class="mb-2 rounded-lg border border-hairline-light dark:border-[#2E3039] bg-canvas-light dark:bg-canvas-dark p-1"
        >
          <button
            v-for="t in HEADER_TEMPLATES"
            :key="t.label"
            class="flex items-baseline gap-2 w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-brand-tint dark:hover:bg-[#1C2140]"
            @click="onTemplate(g.id, t)"
          >
            <span class="font-medium">{{ t.label }}</span>
            <span class="font-mono text-[10px] text-muted-light dark:text-muted-dark truncate">{{ t.name }}</span>
          </button>
        </div>

        <!-- Editable header rows -->
        <div v-for="h in g.headers" :key="h.id" class="py-0.5">
          <div v-if="h.label" class="pl-6 text-[10px] font-medium text-muted-light dark:text-muted-dark truncate">{{ h.label }}</div>
          <div class="flex items-center gap-1.5 py-0.5">
          <input type="checkbox" v-model="h.enabled" class="accent-brand w-3.5 h-3.5 shrink-0" title="Enable" />
          <button
            class="shrink-0 uppercase text-[9.5px] font-bold tracking-wide px-1.5 py-1 rounded"
            :class="
              h.target === 'response'
                ? 'bg-[#F1F2F4] text-muted-light dark:bg-[#24262E] dark:text-muted-dark'
                : 'bg-brand-tint text-brand dark:bg-[#1C2140] dark:text-[#8FB4FF]'
            "
            title="Toggle request/response"
            @click="toggleTarget(h)"
          >{{ h.target === 'response' ? 'RES' : 'REQ' }}</button>
          <button
            class="shrink-0 uppercase text-[9.5px] font-bold px-1.5 py-1 rounded bg-hairline-light dark:bg-[#24262E] text-muted-light dark:text-muted-dark"
            title="Cycle set / append / remove"
            @click="cycleOp(h)"
          >{{ opLabel(h.op) }}</button>
          <input
            v-model="h.name"
            list="oh-header-names"
            placeholder="Header"
            class="flex-1 min-w-0 font-mono text-xs bg-transparent border rounded px-1.5 py-1 outline-none focus:border-brand"
            :class="isSensitiveHeader(h.name) ? 'border-warning/60' : 'border-hairline-light dark:border-[#2E3039]'"
          />
          <input
            v-if="h.op !== 'remove'"
            v-model="h.value"
            placeholder="value"
            class="flex-1 min-w-0 font-mono text-xs bg-transparent border border-hairline-light dark:border-[#2E3039] rounded px-1.5 py-1 outline-none focus:border-brand"
          />
          <span v-else class="flex-1 text-[10px] text-muted-light dark:text-muted-dark italic">removed</span>
          <button class="shrink-0 text-muted-light dark:text-muted-dark hover:text-danger px-0.5" title="Remove" @click="removeHeader(g.id, h.id)">✕</button>
          </div>
        </div>

        <div v-if="g.headers.length === 0" class="text-[11px] text-muted-light dark:text-muted-dark pt-1">
          No headers yet.
        </div>

        <!-- Always-visible add affordance below the last row -->
        <button
          class="w-full mt-1.5 py-1.5 rounded-lg border border-dashed border-hairline-light dark:border-[#3A3C46] text-[11px] font-medium text-muted-light dark:text-muted-dark hover:text-brand hover:border-brand transition-colors"
          @click="addHeader(g.id, 'request')"
        >
          + Add header
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer
      v-if="!gameOpen"
      class="px-4 py-2.5 border-t border-hairline-light dark:border-hairline-dark text-xs"
    >
      <div class="flex items-center justify-between">
        <button class="font-semibold text-brand dark:text-[#8FB4FF] hover:underline" @click="openOptions">
          Advanced editor →
        </button>
        <a
          :href="APP.donate.buyMeACoffee"
          target="_blank"
          rel="noopener"
          class="text-muted-light dark:text-muted-dark hover:text-brand"
          >♥ Support</a
        >
      </div>
      <div class="mt-1.5 text-center text-[10px] text-muted-light dark:text-muted-dark">
        <a :href="APP.homepage" target="_blank" rel="noopener" class="hover:text-brand">{{ APP.company }}</a>
        <span v-if="version"> · v{{ version }}</span>
      </div>
    </footer>

    <!-- Easter-egg game (inline & compact so the popup never scrolls) -->
    <section v-if="gameOpen" class="px-4 py-4 flex flex-col items-center">
      <div class="w-full flex items-center justify-between mb-2">
        <span class="text-xs font-semibold">You found it 🎮</span>
        <button class="text-xs text-muted-light dark:text-muted-dark hover:text-brand" @click="gameOpen = false">Close</button>
      </div>
      <StackGame />
    </section>

    <SponsorOverlay v-if="showSponsor" @close="showSponsor = false" />

    <!-- Shared autocomplete source -->
    <datalist id="oh-header-names">
      <option v-for="n in COMMON_HEADER_NAMES" :key="n" :value="n" />
    </datalist>
  </div>
</template>
