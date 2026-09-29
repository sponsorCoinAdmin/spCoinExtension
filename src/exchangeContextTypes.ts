// File: src/exchangeContextTypes.ts
//
// 2026-09-18, on request ("use the NPM ExchangeContext type definition to
// declare the ExchangeContext for both the web app and the extension") —
// inert, type-only re-export. Nothing in this extension reads or writes an
// ExchangeContext today: sidepanel.ts/background.ts run entirely on
// @sponsorcoin/spcoin-feeds' plain REST-fetch model instead (confirmed,
// see docs/npmMigrationDesign.md's stage 4 entry in the parent app repo).
// This file exists purely so the shared shape is available to import from
// here ahead of any real usage — deliberate groundwork, not a runtime
// change.
//
// Updated same day, Phase B.1 of the ExchangeContext runtime unification
// (docs/npmMigrationDesign.md's stage 7): @sponsorcoin/spcoin-exchange-engine
// now has real content — the write/boot/storage extension-point contract
// and the shared ExchangeContextState React.Context object (not just
// types). Re-exporting the CONTRACT layer from there, and the raw DATA
// shape (ExchangeContext, Accounts, Settings, etc.) still from
// @sponsorcoin/spcoin-common — that split (spcoin-common = what the data
// IS, spcoin-exchange-engine = the runtime contract around it) matches the
// two packages' own documented scope, not something invented here. Still
// nothing imports this file — the stateful Provider that would actually
// produce/consume a real ExchangeContext value is "Phase B.2," explicitly
// deferred (see .claude/plans/warm-questing-cookie.md in the parent app
// repo for the 4 open questions blocking it).

export type {
  ExchangeContext,
  APICoreSyncedMembers,
  Accounts,
  Settings,
  NetworkElement,
  TokenContract,
  TradeData,
  ActiveTokens,
  spCoinAccount,
  TradeExecutionLock,
  ExchangeContextPatch,
} from '@sponsorcoin/spcoin-common/context';

export {
  ExchangeContextState,
  ensureNetwork,
  clone,
  lower,
} from '@sponsorcoin/spcoin-exchange-engine';

export type {
  ExchangeContextType,
  ExchangeContextWriteMiddleware,
  ExchangeContextPersistFn,
  ExchangeContextWriteExtensions,
  ExchangeContextBootPanelExtension,
  ExchangeContextBootExtensions,
  ExchangeContextStorageReadFn,
  ExchangeContextStorageExtensions,
} from '@sponsorcoin/spcoin-exchange-engine';
