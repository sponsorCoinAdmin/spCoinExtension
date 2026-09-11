import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      // Declared explicitly rather than relying on @crxjs/vite-plugin to
      // auto-discover it from manifest.json's side_panel.default_path —
      // this exact "the plugin didn't pick up an HTML entry on its own"
      // failure already happened once today (popup.html silently missing
      // from dist/ right after default_popup was removed), so being
      // explicit here is a safety net regardless of whether this crx
      // version's side_panel auto-discovery works or not.
      input: {
        sidepanel: 'sidepanel.html',
      },
    },
  },
});
