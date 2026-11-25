// File: src/registerBrowserDebug.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- what the wallet's debug dump (the ladybug, Ctrl+Alt+B) says about the stand-alone host: which app it is, the chain, and the wallet's own state. The extension registers the same kind of facts in sidepanel.ts;
// without this every section of the dump read "(not provided)". The dump is pasted into chats and tickets, so it carries NO secrets: the chain endpoint is reduced to its host (a URL can carry an access token in its path), and there are no keys, phrases or passwords.
import { meritDebug, registerHostDebug } from '@sponsorcoin/merit-wallet';
import type { BrowserWallet } from './createBrowserWallet';

/** The endpoint as the dump may show it: scheme and host only. */
export function endpointForDump(rpcUrl: string): string {
  try {
    const url = new URL(rpcUrl);
    return `${url.protocol}//${url.host}/...`;
  } catch {
    return '(not a valid URL)';
  }
}

let registeredFor: unknown;

export function registerBrowserDebug(core: BrowserWallet, build = 'browser-dev'): void {
  if (registeredFor === core) return;
  registeredFor = core;
  const chain = core.chains[0];
  registerHostDebug(meritDebug, () => ({ app: 'browser', build, server: 'none (the stand-alone wallet does not use a hosted app)', chainId: chain.chainId, rpcUrl: endpointForDump(chain.rpcUrl) }));
  meritDebug.setSection('browser', () => ({
    unlocked: core.vault.isUnlocked(),
    accounts: core.vault.isUnlocked() ? core.vault.accounts().length : '(locked)',
    active: core.vault.isUnlocked() ? core.vault.activeAddress() : '(locked)',
    pendingApprovals: core.approvals.list().length,
    chains: core.chains.map((c) => ({ chainId: c.chainId, endpoint: endpointForDump(c.rpcUrl) })),
  }));
}
