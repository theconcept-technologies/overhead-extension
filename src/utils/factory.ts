import {
  GROUP_COLORS,
  HeaderGroup,
  HeaderOp,
  HeaderRule,
  HeaderTarget,
} from '../types';

/** Stable unique id. crypto.randomUUID is available in SW + extension pages. */
export function newId(): string {
  return crypto.randomUUID();
}

export function createHeaderRule(
  partial: Partial<HeaderRule> = {}
): HeaderRule {
  return {
    id: newId(),
    target: (partial.target ?? 'request') as HeaderTarget,
    op: (partial.op ?? 'set') as HeaderOp,
    name: partial.name ?? '',
    value: partial.value ?? '',
    enabled: partial.enabled ?? true,
    ...(partial.label ? { label: partial.label } : {}),
  };
}

export function createGroup(
  index: number,
  partial: Partial<HeaderGroup> = {}
): HeaderGroup {
  return {
    id: partial.id ?? newId(),
    name: partial.name ?? `Group ${index + 1}`,
    color: partial.color ?? GROUP_COLORS[index % GROUP_COLORS.length],
    enabled: partial.enabled ?? false,
    exclusiveTag: partial.exclusiveTag,
    condition: partial.condition ?? { matchType: 'all', pattern: '' },
    headers: partial.headers ?? [createHeaderRule()],
  };
}
