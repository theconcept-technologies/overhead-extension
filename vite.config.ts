import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Emit static extension assets (manifest, HTML entry pages, icons) into dist/.
// Mirrors the proven xDebugHelperPro build glue, extended for a second (options) page.
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    generateBundle() {
      // HTML entry pages
      for (const page of ['popup.html', 'options.html']) {
        this.emitFile({
          type: 'asset',
          fileName: page,
          source: fs.readFileSync(resolve(__dirname, `src/${page}`), 'utf-8'),
        });
      }

      // Manifest — point the service worker at the bundled file name.
      const rawManifest = JSON.parse(
        fs.readFileSync(resolve(__dirname, 'src/manifest.json'), 'utf-8')
      );
      rawManifest.background.service_worker = 'background.js';
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(rawManifest, null, 2),
      });

      // Icons
      const iconDir = resolve(__dirname, 'src/icons');
      if (fs.existsSync(iconDir)) {
        for (const file of fs.readdirSync(iconDir)) {
          if (file.endsWith('.png') || file.endsWith('.svg')) {
            this.emitFile({
              type: 'asset',
              fileName: `icons/${file}`,
              source: fs.readFileSync(resolve(iconDir, file)),
            });
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    vue({
      template: {
        // Let Vue treat the easter-egg game element as a custom element.
        compilerOptions: { isCustomElement: (tag) => tag === 'overhead-stack' },
      },
    }),
    copyAssetsPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: { port: 5178, strictPort: false },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.ts'),
        options: resolve(__dirname, 'src/options.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Single shared stylesheet for both UI pages.
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'ui.css';
          }
          return '[name].[ext]';
        },
      },
    },
  },
  publicDir: 'public',
});
