// File: src/auth/registerApprovingWallet.ts
//
// 2026-11-05 (owner request): the trade button says "Approve on <wallet>" instead of "Swapping…" while ANOTHER wallet (MetaMask, the Merit extension, a hardware device) has the swap's request open. The buttons live in the panels package, which cannot read this
// package's approval store, so the wallet registers one hook with the engine: the name of the first open request that is not the running wallet's own screen (`own`), or undefined. A HOST calls it, once at boot: the web app does (it is the wallet other wallets approve for); the Merit extension does not, so its trade button keeps "Swapping…" (owner decision, 2026-11-05).
import { useSyncExternalStore } from 'react';
import { setApprovingWalletHook } from '@sponsorcoin/spcoin-exchange-engine';
import { approvalWaiting } from './approvalWaiting';
const approvingWalletName = () => approvalWaiting.getState().find((entry) => !entry.own)?.label;
let registered = false;
export function registerApprovingWalletHook() {
    if (registered)
        return;
    registered = true;
    setApprovingWalletHook(() => useSyncExternalStore(approvalWaiting.subscribe, approvingWalletName, approvingWalletName));
}
