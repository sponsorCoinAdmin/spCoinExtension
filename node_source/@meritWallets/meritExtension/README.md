# @meritWallets/meritExtension

The **EXT** shell for the Chrome extension (its side panel or any extension page).

It does not draw a wallet and it does not use the MeritWallet component. It opens the wallet page (`@meritWallets/meritWeb`) through `@meritWallets/meritIFrame` as the `EXT` type, and passes this host's own functions (`copyText`, `openUrl`, `close`, and any other name) and plain-data settings to the wallet as injectables.

```ts
import { mountMeritExtension } from '@meritWallets/meritExtension';

mountMeritExtension({
  element: document.getElementById('wallet')!,
  walletUrl: 'https://sponsorcoin.org/',          // or a path inside the host's own files
  injectables: { functions: { close: () => window.close() } },
});
```

See `docs/design/meritWalletDesign.txt`, section 11 (one set of injectables, two ways to mount).

## Build

```bash
npm run build      # tsc -> dist/
npm run typecheck
```
