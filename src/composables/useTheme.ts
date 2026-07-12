import { watchEffect } from 'vue';
import { ThemePreference } from '../types';

/** Reflect the theme preference onto <html class="dark"> for Tailwind. */
export function applyTheme(getPref: () => ThemePreference) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    const pref = getPref();
    const dark = pref === 'dark' || (pref === 'system' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
  };
  media.addEventListener('change', update);
  watchEffect(update);
}
