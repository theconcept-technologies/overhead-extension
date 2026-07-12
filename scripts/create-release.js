/**
 * Bump version (package.json + src/manifest.json), build, and zip dist/ for the
 * Chrome Web Store. Upload the resulting zip manually in the developer dashboard.
 *
 * Usage: node scripts/create-release.js [patch|minor|major]
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing: ${cmd}`);
    process.exit(1);
  }
}

function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const type = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Invalid version type. Use: major, minor, or patch');
    process.exit(1);
  }

  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const newVersion = bump(pkg.version, type);

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  const manifestPath = path.join(process.cwd(), 'src/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✨ Version ${newVersion}`);
  console.log('🏗️  Building…');
  run('npm run build');

  if (!fs.existsSync('dist')) {
    console.error('dist/ not found — build failed?');
    process.exit(1);
  }

  const zipName = `overhead-v${newVersion}.zip`;
  console.log(`📦 Zipping → ${zipName}`);
  run(`cd dist && zip -r ../${zipName} . && cd ..`);

  console.log(`
✅ ${zipName} ready.

Next steps:
1. Open the Chrome Web Store developer dashboard.
2. Upload ${zipName} to the Overhead listing.
3. Fill in the privacy tab: "This item does not collect user data".
4. Submit for review.
`);
}

main();
