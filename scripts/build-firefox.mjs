/**
 * Build a Firefox (AMO) package from the standard build.
 *
 * Firefox MV3 differences we handle here:
 *  - Background: Firefox uses an event page (`background.scripts`), not a service
 *    worker. Our background.js is an ES module, so we keep `type: "module"`.
 *  - `browser_specific_settings.gecko.id` + `strict_min_version` are required by AMO.
 *  - `minimum_chrome_version` is a Chrome-only key — dropped for the Firefox build.
 *
 * The header engine (declarativeNetRequest modifyHeaders, request + response,
 * dynamic rules) is supported by Firefox 128+, hence the strict_min_version.
 *
 * Output: dist-firefox/ + overhead-firefox-v<version>.zip
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const ffDir = path.join(root, 'dist-firefox');

const GECKO_ID = 'overhead@theconcept-technologies.com';
const STRICT_MIN_VERSION = '128.0';

console.log('🏗️  Building extension…');
execSync('npm run build', { stdio: 'inherit', cwd: root });

if (!fs.existsSync(dist)) {
  console.error('dist/ not found — build failed?');
  process.exit(1);
}

console.log('🦊 Preparing Firefox package…');
fs.rmSync(ffDir, { recursive: true, force: true });
fs.cpSync(dist, ffDir, { recursive: true });

const manifestPath = path.join(ffDir, 'manifest.json');
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Firefox uses an event page (module background script), not a service worker.
m.background = { scripts: ['background.js'], type: 'module' };
delete m.minimum_chrome_version;
m.browser_specific_settings = {
  gecko: {
    id: GECKO_ID,
    strict_min_version: STRICT_MIN_VERSION,
    // Overhead collects nothing — declare it explicitly for Firefox's data consent.
    data_collection_permissions: { required: ['none'] },
  },
};

fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');

const version = m.version;
const zipName = `overhead-firefox-v${version}.zip`;
fs.rmSync(path.join(root, zipName), { force: true });
execSync(`cd "${ffDir}" && zip -rq "../${zipName}" .`, { stdio: 'inherit', shell: '/bin/bash' });

console.log(`\n✅ ${zipName} ready (Firefox / AMO).`);
console.log(`   gecko id: ${GECKO_ID} · strict_min_version: ${STRICT_MIN_VERSION}`);
