/**
 * Import / export of the local configuration, plus a one-click migration path
 * from ModHeader's export format.
 */
import { HeaderGroup, HeaderRule, SCHEMA_VERSION, StorageData } from '../types';
import { createGroup, createHeaderRule } from './factory';

const EXPORT_KIND = 'overhead-config';

export interface ExportBundle {
  kind: typeof EXPORT_KIND;
  version: number;
  exportedAt: string;
  groups: HeaderGroup[];
}

export function exportGroups(data: StorageData): string {
  const bundle: ExportBundle = {
    kind: EXPORT_KIND,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    groups: data.groups,
  };
  return JSON.stringify(bundle, null, 2);
}

export type ImportResult =
  | { ok: true; groups: HeaderGroup[]; source: 'overhead' | 'modheader' }
  | { ok: false; error: string };

/** Parse either a native Overhead export or a ModHeader export. */
export function parseImport(raw: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }

  // Native Overhead bundle
  if (isRecord(json) && json.kind === EXPORT_KIND && Array.isArray(json.groups)) {
    return { ok: true, groups: normalizeGroups(json.groups as HeaderGroup[]), source: 'overhead' };
  }

  // ModHeader export: an array of profiles.
  const modheader = tryParseModHeader(json);
  if (modheader) return { ok: true, groups: modheader, source: 'modheader' };

  return { ok: false, error: 'Unrecognized format (expected Overhead or ModHeader export).' };
}

/**
 * ModHeader profiles look roughly like:
 *   [{ title, headers: [{name, value, enabled}], respHeaders: [...],
 *      urlFilters: [{urlRegex}], appendMode, color }]
 */
function tryParseModHeader(json: unknown): HeaderGroup[] | null {
  const profiles = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.profiles) ? json.profiles : null;
  if (!profiles) return null;
  if (!profiles.every((p) => isRecord(p) && (Array.isArray((p as any).headers) || Array.isArray((p as any).respHeaders)))) {
    return null;
  }

  return profiles.map((p: any, index: number) => {
    const headers: HeaderRule[] = [];
    for (const h of p.headers ?? []) {
      if (!isRecord(h) || !h.name) continue;
      headers.push(
        createHeaderRule({
          target: 'request',
          op: p.appendMode ? 'append' : 'set',
          name: String(h.name),
          value: String(h.value ?? ''),
          enabled: h.enabled !== false,
        })
      );
    }
    for (const h of p.respHeaders ?? []) {
      if (!isRecord(h) || !h.name) continue;
      headers.push(
        createHeaderRule({
          target: 'response',
          op: 'set',
          name: String(h.name),
          value: String(h.value ?? ''),
          enabled: h.enabled !== false,
        })
      );
    }

    const firstFilter = Array.isArray(p.urlFilters) && p.urlFilters.length > 0 ? p.urlFilters[0] : null;
    const regex = firstFilter && isRecord(firstFilter) ? String(firstFilter.urlRegex ?? '') : '';

    return createGroup(index, {
      name: typeof p.title === 'string' && p.title.trim() ? p.title : `Imported ${index + 1}`,
      color: typeof p.color === 'string' && p.color ? p.color : undefined,
      enabled: false,
      condition: regex ? { matchType: 'regexFilter', pattern: regex } : { matchType: 'all', pattern: '' },
      headers: headers.length ? headers : [createHeaderRule()],
    });
  });
}

/** Re-key imported groups/rules with fresh ids so they never collide. */
function normalizeGroups(groups: HeaderGroup[]): HeaderGroup[] {
  return groups.map((g, i) =>
    createGroup(i, {
      name: g.name,
      color: g.color,
      enabled: false,
      exclusiveTag: g.exclusiveTag,
      condition: g.condition ?? { matchType: 'all', pattern: '' },
      headers: (g.headers ?? []).map((h) =>
        createHeaderRule({ target: h.target, op: h.op, name: h.name, value: h.value, enabled: h.enabled, label: h.label })
      ),
    })
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
