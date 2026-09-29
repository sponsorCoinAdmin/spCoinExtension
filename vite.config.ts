import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [tailwindcss(), crx({ manifest })],
  // 2026-09-18, real bug found live ("Cannot read properties of null
  // (reading 'useState')") — @sponsorcoin/spcoin-exchange-engine (and, by
  // the same mechanism, spcoin-panels/spcoin-common/spcoin-feeds) are
  // consumed via a directory junction (node_source/..., not a real
  // node_modules install). Vite doesn't preserve symlinks by default —
  // it resolves each package to its real, junctioned path and re-resolves
  // `react`/`react-dom` FROM there, which can land on a logically
  // separate module instance from the one sidepanel.ts's own direct
  // import resolves to, even though both ultimately point at the exact
  // same file on disk (a well-documented Vite gotcha for monorepo/
  // npm-linked package setups, not unique to this codebase). Explicit
  // dedupe forces every resolution of these two packages to the single
  // instance under this repo's own node_modules, regardless of which
  // importer's (real, symlink-resolved) path asked for it.
  //
  // 2026-09-21, real bug found live ("useExchangeContext must be used
  // within an ExchangeProvider", panel completely blank) — this exact
  // warned-about-but-not-yet-real mechanism above finally hit
  // `@sponsorcoin/spcoin-exchange-engine` itself: Path A gave
  // `spcoin-panels` (via a new `node_modules/@sponsorcoin/
  // spcoin-exchange-engine` junction, added the same day) its own direct
  // import of this package for the first time — a new resolution path
  // `sidepanel.ts`'s own top-level import doesn't share. Unlike
  // `spcoin-common`'s own long-standing nested junction (plain
  // enums/functions — duplication there is harmless), this package
  // exports a real React Context (`ExchangeContextState`); two separate
  // module instances means two separate Context objects, so
  // `useExchangeContext()` calls resolved through `spcoin-panels`' own
  // path can't see a Provider value written through the other. Added
  // here for the identical reason `react`/`react-dom` already are.
  resolve: {
    dedupe: ['react', 'react-dom', '@sponsorcoin/spcoin-exchange-engine'],
  },
  build: {
    // 2026-09-11, on request: renamed from Vite's default `dist` so this
    // repo's build output has a name that says what it's for — the folder
    // to point Chrome's "Load Unpacked" at directly, permanently, during
    // local iteration (no zip/download/unzip round trip, and no risk of
    // stale hash-named files lingering the way an ad hoc unzip-over-an-
    // existing-folder can: Vite's own emptyOutDir default, still in
    // effect, wipes this directory clean before every build). CI's own
    // release workflows zip this same folder for the website's download
    // button — see release.yml/production-release.yml.
    outDir: 'deploy',
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
