import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      // popup.html used to be auto-discovered by @crxjs/vite-plugin via
      // manifest.json's action.default_popup — removed 2026-09-10 (see
      // background.ts/openPopupWindow.ts) so the extension can open a
      // real, persistent chrome.windows.create window instead of Chrome's
      // auto-closing default_popup overlay. Without default_popup, crx
      // has no way to find popup.html on its own anymore (confirmed live:
      // a build right after removing it produced no popup.html/popup.ts
      // output at all) — declared explicitly here instead so it's still
      // bundled and copied into dist/, where openPopupWindow.ts's
      // chrome.runtime.getURL('popup.html') expects to find it.
      input: {
        popup: 'popup.html',
      },
    },
  },
});
