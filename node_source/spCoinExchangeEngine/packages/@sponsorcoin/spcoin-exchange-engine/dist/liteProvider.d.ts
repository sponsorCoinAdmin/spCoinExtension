import { type ReactNode } from 'react';
import type { ExchangeContext } from '@sponsorcoin/spcoin-common/context';
import { type ExchangeContextWriteExtensions, type ExchangeContextBootExtensions, type ExchangeContextStorageExtensions, type ExchangeContextWalletSource } from './exchangeContextContract';
import { type DisplayStackStorage } from './panelTree/displayStackStore';
/** Minimal, structurally-valid cold-boot default — every field
 *  ExchangeContext/APICoreSyncedMembers/TradeData require, nothing more.
 *  See exchangeContextContract.ts's own ExchangeContextWalletSource doc
 *  comment for why chainId is always a real number, never undefined. */
export declare function buildDefaultExchangeContext(chainId: number): ExchangeContext;
export interface LiteExchangeProviderProps {
    children?: ReactNode;
    /** See ExchangeContextWalletSource's own doc comment — a real
     *  wagmi/viem-backed source, or a stub while Stage 2 hasn't landed for
     *  this consumer yet. */
    walletSource: ExchangeContextWalletSource;
    writeExtensions?: ExchangeContextWriteExtensions;
    bootExtensions?: ExchangeContextBootExtensions;
    storageExtensions?: ExchangeContextStorageExtensions;
    displayStackStorage?: DisplayStackStorage;
}
/**
 * A minimal, portable ExchangeContext producer. Mount this instead of the
 * web app's ExchangeProvider for a consumer that doesn't need (or can't
 * yet support) hydration/wagmi/Merit-mimic instrumentation — currently
 * the extension (Stage 1). Same extension-point contract
 * (writeExtensions/bootExtensions/storageExtensions) the web app's own
 * Provider already uses, so a consumer's own real implementations plug in
 * exactly the same way.
 */
export declare function LiteExchangeProvider({ children, walletSource, writeExtensions, bootExtensions, storageExtensions, displayStackStorage, }: LiteExchangeProviderProps): import("react").JSX.Element | null;
