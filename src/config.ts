/**
 * Single source of truth for product naming and links.
 * Keep the extension name-agnostic: change the brand here + in manifest.json only.
 */
export const APP = {
  name: 'Overhead',
  tagline: 'The header editor you can actually trust.',
  storageKey: 'overhead', // top-level chrome.storage.local key
  homepage: 'https://theconcept-technologies.com',
  repo: 'https://github.com/theconcept-technologies/overhead-extension',
  donate: {
    buyMeACoffee: 'https://buymeacoffee.com/theconcepttechnologies',
    githubSponsors: 'https://github.com/sponsors/theconcept-technologies',
  },
} as const;
