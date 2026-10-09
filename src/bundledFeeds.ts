// File: src/bundledFeeds.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 17, E5) -- registers the snapshot made by scripts/bundleFeeds.mjs with the feeds
// package, so the network info, token lists, role account lists and spCoin ABIs are still available when the hosted app cannot be reached
// (the feeds ask the network first; fresh data wins). Import this file once at startup, before any feed is read.
import { registerBundledFeeds } from '@sponsorcoin/spcoin-feeds/shared';
import snapshot from './bundledFeedData.json';

registerBundledFeeds(snapshot as Record<string, unknown>);

/** The bundled snapshot itself, for code that reads a file directly (the spCoin ABI and deployment map). */
export const bundledFeedData = snapshot as Record<string, unknown>;
