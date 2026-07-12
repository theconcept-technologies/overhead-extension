/**
 * Gentle, rate-limited donation nudge. Adapted from xDebugHelperPro:
 * count meaningful activations, show the sponsor overlay at most once/day when a
 * new milestone is crossed. No network, no tracking — purely local counters.
 */
import browser from 'webextension-polyfill';

const KEY = 'overhead_sponsor';
const MILESTONES = [15, 40, 80, 150, 300, 600, 1200, 2500, 5000];

interface SponsorData {
  activations: number;
  shownMilestones: number[];
  lastShownDate: string | null;
}

const DEFAULT: SponsorData = { activations: 0, shownMilestones: [], lastShownDate: null };

async function read(): Promise<SponsorData> {
  try {
    const res = await browser.storage.local.get(KEY);
    return (res[KEY] as SponsorData | undefined) ?? { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

async function write(data: SponsorData): Promise<void> {
  await browser.storage.local.set({ [KEY]: data });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Record an activation and return true if the sponsor overlay should be shown
 * now (a new milestone was reached and nothing was shown today yet).
 */
export async function recordActivation(): Promise<boolean> {
  const data = await read();
  data.activations += 1;

  const reached = MILESTONES.filter(
    (m) => data.activations >= m && !data.shownMilestones.includes(m)
  );
  const today = todayKey();
  const alreadyShownToday = data.lastShownDate === today;

  let show = false;
  if (reached.length > 0 && !alreadyShownToday) {
    data.shownMilestones.push(...reached);
    data.lastShownDate = today;
    show = true;
  }

  await write(data);
  return show;
}
