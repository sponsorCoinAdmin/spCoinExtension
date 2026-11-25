# @meritWallets/meritExtension

The Chrome extension's package. It holds the extension's **injectables** and mounts the wallet into an extension page as the `EXT` type.

- **Injectables:** what the wallet's platform does for `copyText` (the clipboard), `openUrl` (a new tab, through `chrome.tabs`) and `close` (closes the extension page). Further functions (the extension's vault, its connect relay and provider) are added here as they are moved over.
- **Mount:** `mountMeritExtension({ element, core, snapshot, injectables? })` calls `mountMeritWeb` directly. The extension page *is* the wallet's page, so there is no frame.
- It does not use the MeritWallet component. The wallet is `@meritWallets/meritWeb`.

```ts
import { mountMeritExtension } from '@meritWallets/meritExtension';

mountMeritExtension({ element: document.getElementById('root')!, core, snapshot });
```

`injectables` lays the app's own functions over the defaults (a function with the same name replaces the default); the type is always `EXT`.

## Build and test

```bash
npm run build   # tsc -> dist/
npm test        # the injectables, run without a browser
```

See `docs/design/meritWalletDesign.txt`, section 11.
