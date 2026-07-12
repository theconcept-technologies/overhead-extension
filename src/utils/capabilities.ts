/**
 * Capability layer. v1 ships everything unlocked (free + donations), but all
 * gating decisions funnel through here so a future paid tier is a one-file change
 * (e.g. wire in an ExtensionPay/Paddle license check inside `isPro`).
 */

export type ProFeature =
  | 'unlimited-groups'
  | 'response-headers'
  | 'shared-export'
  | 'header-templates'
  | 'regex-conditions';

/** Features that carry a "Pro" label in the UI (still usable in v1). */
export const PRO_FEATURES: ReadonlySet<ProFeature> = new Set<ProFeature>([
  'unlimited-groups',
  'response-headers',
  'shared-export',
  'header-templates',
  'regex-conditions',
]);

/**
 * v1: always true — nothing is actually locked. Kept as the single seam for
 * later monetization.
 */
export function isPro(): boolean {
  return true;
}

/** Whether a feature is available to the current user. */
export function hasFeature(_feature: ProFeature): boolean {
  return isPro();
}

/** Whether to render a subtle "Pro" badge next to a feature. */
export function isProFeature(feature: ProFeature): boolean {
  return PRO_FEATURES.has(feature);
}
