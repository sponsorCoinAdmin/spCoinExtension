// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/index.ts
//
// Public barrel. See exchangeContextContract.ts's own header comment for
// what this package does and does not contain yet (Phase B.1 vs. the
// still-deferred Phase B.2).
export { EMPTY_WRITE_MIDDLEWARE, NOOP_PERSIST, DEFAULT_BOOT_PANEL_EXTENSION, DEFAULT_STORAGE_READ, ExchangeContextState, ensureNetwork, clone, lower, } from './exchangeContextContract';
// 2026-09-18 — real hooks, first batch (see hooks/useExchangeContext.ts's
// own header comment). Genuinely portable: each depends only on
// useExchangeContext() (built on ExchangeContextState above, moved in
// Phase B.1) and React itself — no ExchangeProvider-internal or
// Next.js-specific dependency. The picker-opening mechanics
// (useOpenActiveListPanel/usePanelVisible, tied to the parent app's own
// live panel-tree store) and useSelectionCommit (pulls in the still-
// deferred account-hydration REST layer) are NOT part of this batch —
// still blocked, see the approved plan's "Phase B scope decision".
export { useExchangeContext } from './hooks/useExchangeContext';
export { useAccounts } from './hooks/accounts/useAccounts';
export { useActiveAccount } from './hooks/accounts/useActiveAccount';
export { useAgentAccount } from './hooks/accounts/useAgentAccount';
export { useSponsorAccount } from './hooks/accounts/useSponsorAccount';
export { useRecipientAccounts } from './hooks/accounts/useRecipientAccounts';
export { useSponsorAccounts } from './hooks/accounts/useSponsorAccounts';
export { useAgentAccounts } from './hooks/accounts/useAgentsAccounts';
export { validateAccount, } from './hooks/dropDowns/validateAccount';
// 2026-09-21, on direct request ("get the methods also moved over to
// npm so we can have the node panels utilize them") — first slice of
// TokenSelectDropDown's own remaining web-app-only hook logic. Scoped
// tightly to what TokenSelectDropDown actually needs, not the whole
// origin file (lib/context/hooks/nestedHooks/useTokenContracts.ts also
// has useSendTokenContract/usePreviewTokenContract/usePreviewTokenSource/
// useSellTokenAddress/useBuyTokenAddress/usePeerTokenAddress — the last
// one pulls in real /Test-page debug-panel-tree-specific complexity not
// needed here, left in the web app for a separate, later move).
export { useSellTokenContract } from './hooks/dropDowns/useSellTokenContract';
export { useBuyTokenContract } from './hooks/dropDowns/useBuyTokenContract';
export { tokenContractsEqual } from './hooks/dropDowns/tokenContractsEqual';
// 2026-09-25, on request ("migrate them" — the real TradingStationPanel
// sell/buy row hooks) — the trade-primitive layer these rows are built on:
// raw sell/buy amounts, slippage, trade direction, debounce, and the
// token-selection sync effect. All genuinely portable (thin wrappers over
// useExchangeContext, already moved above, or plain React state/refs).
// Two real pieces from the same source files could NOT move here: balance
// fetching (useGetBalance, wagmi-based — wagmi ships ESM-only and this
// package's CJS/node16 module config can't cleanly `require()` it; a real,
// separate build-config decision, not attempted here) and amount string
// parsing (parseValidFormattedAmount, needs viem's real formatUnits, hit
// the same ESM/CJS friction). Both stay web-app-local, joining
// usePriceAPI/TokenPanelProvider's token-hydration/TokenLogo in that
// bucket — see docs/panelMigrationStatus.txt's dated entry for the full
// per-piece reasoning.
export { useSellAmount, useBuyAmount } from './hooks/trade/useAmounts';
export { useSlippage, useSlippagePercent } from './hooks/trade/useSlippage';
export { useTradeDirection, useTradeData } from './hooks/trade/useTradeDirection';
export { useDebounce } from './hooks/trade/useDebounce';
export { useTokenSelection } from './hooks/trade/useTokenSelection';
export { useSponsorMode } from './hooks/trade/useSponsorMode';
export { sponsorModeStore } from './hooks/trade/sponsorModeStore';
export { sponsorSwapStore } from './hooks/trade/sponsorSwapStore';
// 2026-09-27 — sponsorRateConfigStore + deriveSponsorRatePercentages moved
// here from the web app's lib/store/sponsorRateConfigStore.ts (same pattern
// as sponsorModeStore above — plain pub-sub singleton, no web-app coupling).
// Needed by the portable ConfigSponsorshipPanel shell in @sponsorcoin/spcoin-panels.
export { sponsorRateConfigStore, deriveSponsorRatePercentages } from './hooks/trade/sponsorRateConfigStore';
// 2026-09-28, moved from the parent app's lib/store/ — plain pub-sub singletons
// needed by the portable useSwapFunctions/swap execution hooks (Phase 4
// CONNECT_TRADE_BUTTON migration). Zero web-app coupling.
export { stepThroughApprovalStore } from './hooks/trade/stepThroughApprovalStore';
export { popupActiveStore } from './hooks/trade/popupActiveStore';
export { swapCompletedStore } from './hooks/trade/swapCompletedStore';
export { sponsorSwapAmountStore } from './hooks/trade/sponsorSwapAmountStore';
export { stakeRefreshStore } from './hooks/trade/stakeRefreshStore';
export { useSwapFunctions } from './hooks/trade/useSwapFunctions';
export { clampDisplay, isIntermediateDecimal, maxInputSz, TYPING_GRACE_MS } from './utils/tradeFormat';
// 2026-09-25, on request ("migrate useGetBalance/parseValidFormattedAmount")
// — unblocked by switching this package's own module config to
// module:"esnext"/moduleResolution:"bundler" (see tsconfig.json's own
// header comment) — wagmi (ESM-only) and viem's formatUnits both now
// resolve cleanly, confirmed via a real tsc build.
export { useGetBalance } from './hooks/trade/useGetBalance';
export { parseValidFormattedAmount } from './utils/parseValidFormattedAmount';
// 2026-09-25, on request ("do issue 2" — TokenLogo's dependency chain).
// Every piece TokenLogo.tsx (see spcoin-panels' own new copy) actually
// needs, confirmed portable file-by-file: pure path/chain-id computation
// (chainIdMap.ts's 2-entry mapping table, inlined as TS rather than a
// JSON import; diskPathResolver.ts; address.ts, all pure, zero
// ExchangeContext coupling), a minimal slice of assetHelpers.ts (NOT the
// full 416-line file — just defaultMissingImage/getTokenLogoURL and their
// own real dependency chain; the rest is real HTTP-existence-probing/
// IndexedDB-caching infrastructure, out of scope), and two thin
// ExchangeContext hooks (usePreviewTokenContract/usePreviewTokenSource).
export { toMappedChainId, toOriginalChainId, isMappedChainId, getChainIdAssetMap } from './utils/chainIdMap';
export { resolveSpCoinDiskChainId, normalizeDiskAddress, toDiskAddressFolderName, getDiskAccountsPublicRoot, getDiskBlockchainsPublicRoot, getDiskContractsPublicRoot, } from './utils/diskPathResolver';
export { normalizeAddress, isAddress, toNormalizedAddress } from './utils/address';
export { defaultMissingImage, badTokenAddressImage, getContractRoot, getTokenLogoURL, } from './utils/tokenAssetHelpers';
export { usePreviewTokenContract, usePreviewTokenSource } from './hooks/trade/usePreviewToken';
export { usePreloadedImageSrc } from './hooks/usePreloadedImageSrc';
// 2026-09-25, on request ("migrate CONNECT_TRADE_BUTTON... start with the
// shared execution primitives") — describeEthersError is the one piece of
// that investigation that was genuinely a lightweight, self-contained
// primitive (zero imports). getConnectedSigner (the other candidate) was
// NOT moved — it depends on meritConnect, a 1,872-line security/keystore/
// approval system the extension has no equivalent of yet; see
// docs/npmMigrationDesign.md's own dated entry for the full reasoning.
export { describeEthersError, extractEthersErrorReason, extractEthersErrorGasFee } from './utils/describeEthersError';
// 2026-09-26, Phase 4 — portable trade execution (swap/stake/approve).
// Moved to @sponsorcoin/spcoin-onchain as the single source of truth for
// all on-chain calldata building (ERC20 approve, Uniswap V3 single/multi-hop
// swap, spCoin stake). The engine package re-exports here so existing
// consumers of @sponsorcoin/spcoin-exchange-engine see no import path
// change — no circular dependency since onchain imports TradeExecutor types
// from engine, and engine just re-exports execution modules from onchain.
export { executeErc20Approve, } from '@sponsorcoin/spcoin-onchain';
export { executeUniswapV3Swap, } from '@sponsorcoin/spcoin-onchain';
export { executeMultiHopUniswapV3Swap, } from '@sponsorcoin/spcoin-onchain';
export { executeStakeTransactionCore, snapRateToIncrement, } from '@sponsorcoin/spcoin-onchain';
// 2026-09-18 — the panel-tree runtime (see the approved plan at
// .claude/plans/warm-questing-cookie.md). Nine of eleven original files
// had zero web-app-specific coupling; the three real ones (wallet-gate
// check, display-stack storage, debug tracing) are now injectable — see
// panelTreeCallbacks.ts's setPanelTreeGateCheck, displayStackStore.tsx's
// DisplayStackProvider `storage` prop, and traceSink.ts's
// setPanelTreeTraceSink. The web app wires its real implementations in
// once at boot; a bare consumer of this package gets safe no-op/default
// behavior for all three without wiring anything.
export { usePanelTree } from './panelTree/usePanelTree';
export { usePanelVisible } from './panelTree/usePanelVisible';
export { useSetPanelVisible, KNOWN as PANEL_TREE_KNOWN } from './panelTree/useSetPanelVisible';
export { useEnforceRadioPanelGroups } from './panelTree/useEnforceRadioPanelGroups';
export { useEnforcePanelAncestorVisibility } from './panelTree/useEnforcePanelAncestorVisibility';
export { panelStore } from './panelTree/panelStore';
export { panelTreeOpenSourceStore, usePanelTreeOpenSource, } from './panelTree/panelTreeOpenSourceStore';
export { DisplayStackProvider, useDisplayStack, } from './panelTree/displayStackStore';
export { setPanelTreeTraceSink } from './panelTree/traceSink';
// 2026-09-29, library isolation audit — the 6 panelTree/* files' own
// process.env.NEXT_PUBLIC_DEBUG_LOG_*/NEXT_PUBLIC_PERF_MARKS reads are now
// injectable via this configure call, same shape as setPanelTreeGateCheck/
// setPanelTreeTraceSink above. The web app's own AppBootstrap.tsx should
// call this once with its real process.env reads to restore its existing
// debug-flag behavior; the extension simply never calls it.
export { configureDebugFlags, flags as debugFlags } from './panelTree/debugFlags';
export { createPanelTreeCallbacks, setPanelTreeGateCheck, } from './panelTree/panelTreeCallbacks';
// 2026-09-18, Phase B.2 Stage 1.c — PanelBootstrap moved here, its one
// real coupling (raw localStorage read) now injectable. The repair helper
// functions (repairPanels/etc.) had zero coupling of their own.
export { PanelBootstrap, isMainPanels, ensurePanelNamesInMemory, repairPanels, dropNonPersisted, ensureRequiredPanels, reconcileOverlayVisibility, } from './panelTree/panelBootstrap';
// 2026-09-18, "stage 9c" — the dropdown-specific picker-opening hooks
// stage 7b flagged as blocked on "the parent app's own live panel-tree
// store." Unblocked now that panelTree/ above is portable, plus FEED_TYPE
// joining spcoin-common (see lib/structure/enums/enums.ts's own comment
// in the parent app).
export { useOpenActiveListPanel } from './hooks/dropDowns/useOpenActiveListPanel';
export { activeListPanelStore, getPanelTitle, } from './hooks/dropDowns/activeListPanelStore';
export { feedTypeShowsAddressBar } from './hooks/dropDowns/feedTypeShowsAddressBar';
// 2026-09-18, "stage 9d" — found while checking useSelectionCommit.ts's
// dependencies (stage 9c follow-up question). useSelectionCommit itself
// stays blocked (accountHydration.ts, real Phase B.2 coupling), but this
// sibling navigation hook it calls had zero coupling of its own.
export { usePanelTransitions } from './panelTree/usePanelTransitions';
// 2026-09-18, Phase B.2 (wagmi-independent slice) — see the approved plan
// at .claude/plans/warm-questing-cookie.md. The stateful ExchangeProvider
// itself stays deferred (wagmi coupling, Merit-mimic instrumentation,
// PanelBootstrap's own raw localStorage read); this is the one genuinely
// portable piece it currently pulls in.
export { getLastConnectedWalletAddress, setLastConnectedWalletAddress, isSameConnectedWallet, } from './lastConnectedWallet';
// 2026-09-18, Phase B.2 Stage 1.a — a minimal, portable ExchangeContext
// producer for a consumer that isn't the full web app (currently the
// extension). See liteProvider.tsx's own header comment for why this is
// separate from — not a lighter mode of — the web app's own
// lib/context/ExchangeProvider.tsx.
export { LiteExchangeProvider, buildDefaultExchangeContext, } from './liteProvider';
