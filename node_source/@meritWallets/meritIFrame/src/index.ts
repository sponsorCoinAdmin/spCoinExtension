// File: src/index.ts
//
// 2026-11-19 -- @meritWallets/meritIFrame: how a page embeds the stand-alone wallet. All iframe wiring and injections live here. The wallet itself is @meritWallets/meritBrowser (mounted by the spcoin-wallet app); this package only opens it
// (its own window today, an iframe when a page wants one) and takes the wallet's host as an INJECTABLE, e.g. meritIphone's host for a phone-sized frame.
export { openStandaloneWallet, createWalletFrame, STANDALONE_WALLET_URL, STANDALONE_WALLET_WINDOW } from './openStandaloneWallet';
export type { StandaloneWalletOptions, WalletFrameOptions, WalletFrameHandle } from './openStandaloneWallet';

// 2026-11-24: the frame protocol (docs/design/meritWalletDesign.txt section 10): the parent side, the wallet side, and the shared messages.
export { FRAME_PROTOCOL, FRAME_VERSION, FRAME_ACTIONS, frameMessage, isFrameMessage, embedUrl, validateRequest } from './protocol';
export type { FrameWalletType, FrameInit, FrameMessage, ChildMessage, ParentMessage, FrameAction, FrameActionPayloads } from './protocol';
export { connectWalletFrame, defaultFrameHandlers } from './parent';
export type { WalletFrameConnection, ConnectWalletFrameOptions, FrameHandlers } from './parent';
export { awaitParentInit, framePlatformOverrides, injectablesFromParent } from './child';
export type { AwaitParentInitOptions, FrameBridge, FrameParent } from './child';

// 2026-11-25: which wallet page the frame loads, and which parent pages a wallet page accepts
export { resolveWalletUrl, parseAllowedParents } from './walletUrl';

// 2026-11-25: the one options shape both mounts take, and the iframe mount
export type { HostInjectables, InjectedFunction, Json } from './injectables';
export { buildInjectables, customFunctionNames, WELL_KNOWN_FUNCTIONS } from './injectables';
export { mountMeritIFrame } from './mountMeritIFrame';
export type { MountMeritIFrameOptions, MeritIFrameMount } from './mountMeritIFrame';
