// File: test/tradeHost.test.mjs
//
// docs/design/spcoinPackagesDesign.txt 8.5.12: the Swap tab and the Sponsor tab trade through ONE path. A host passes TradeHost (plain data and functions, one hook for the confirm popup's state), never a React node; the component draws the trade button (the shared
// ExchangeButtonController on the engine's price state), the Uniswap section (UniSelectPanelWithSwap), the Sponsor tab and the confirm popup. The merit-wallet swap path (SwapTradeButton, quoteSwap, swapHost) and the host trade nodes are gone.
// Run: node test/tradeHost.test.mjs
// MUTANT=hostNodeProp|noCancelHook|siteLinkIgnored|swapHostBack|tradeNodeBack|swapTabOwnButton|sponsorPanelBack|listHostBack run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let trade = read(PKG, 'src', 'trade', 'tradeHost.tsx');
let panel = read(PKG, 'src', 'sponsor', 'ConnectedSponsorPanel.tsx');
let wallet = read(PKG, 'src', 'MeritWallet.tsx');
const index = read(PKG, 'src', 'index.ts');
if (m === 'hostNodeProp') trade = swap(trade, '  useConfirmHost?(): StakeConfirmHostState;', '  useConfirmHost?(): StakeConfirmHostState;\n  avatarNode?: React.ReactNode;');
if (m === 'noCancelHook') trade = swap(trade, '        onBeforeCancel?.();\n', '');
if (m === 'siteLinkIgnored') panel = swap(panel, 'if (host?.onRecipientSiteClick) host.onRecipientSiteClick(href);', 'if (false) host?.onRecipientSiteClick?.(href);');
if (m === 'swapHostBack') wallet = swap(wallet, '  tradeHost?: TradeHost;', '  tradeHost?: TradeHost;\n  swapHost?: unknown;');
if (m === 'tradeNodeBack') wallet = swap(wallet, '  tradeHost?: TradeHost;', '  tradeHost?: TradeHost;\n  zeroXTradeButtonContent?: React.ReactNode;');
if (m === 'swapTabOwnButton') wallet = swap(wallet, 'zeroXTradeButtonContent: React.createElement(ConnectedTradeButton, { host: tradeHost }),', 'zeroXTradeButtonContent: undefined,');
if (m === 'sponsorPanelBack') wallet = swap(wallet, '  tradeHost?: TradeHost;', '  tradeHost?: TradeHost;\n  sponsorPanel?: React.ReactNode;');
if (m === 'listHostBack') wallet = swap(wallet, '  tradeHost?: TradeHost;', '  tradeHost?: TradeHost;\n  listHost?: React.ReactNode;');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the host contract is data and functions only', () => {
  const contract = trade.slice(trade.indexOf('export interface TradeHost'), trade.indexOf('export const noConfirmHost'));
  assert.doesNotMatch(contract, /ReactNode|JSX\.Element/);
  for (const member of ['apiProvider?: string;', 'onRecipientSiteClick?(href: string): void;', 'useConfirmHost?(): StakeConfirmHostState;']) assert.ok(contract.includes(member), member);
  assert.doesNotMatch(contract, /affiliateFeeRate/);
  assert.match(index, /TradeHost/);
});
await test("the component draws the confirm popup and Cancel reaches the host's hook first", () => {
  assert.match(trade, /onBeforeCancel\?\.\(\);\n\s+popupProps\.onCancel\(\);/);
});
await test('the Swap tab draws the shared trade button and the shared Uniswap section; there is no swapHost and no host trade node', () => {
  assert.match(wallet, /zeroXTradeButtonContent: React\.createElement\(ConnectedTradeButton, \{ host: tradeHost \}\),/);
  assert.match(wallet, /buySuffixContent: React\.createElement\(UniSelectPanelWithSwap\),/);
  assert.match(trade, /<ExchangeButtonController isLoadingPrice=\{isLoading\}/);
  assert.doesNotMatch(wallet, /\n  swapHost\?:/);
  assert.doesNotMatch(wallet, /\n  zeroXTradeButtonContent\?: React\.ReactNode;/);
  assert.doesNotMatch(wallet, /\n  uniSelectContent\?: React\.ReactNode;/);
  for (const gone of ['SwapTradeButton.tsx', 'ConnectedUniSelectPanel.tsx', 'useSwapQuote.ts', 'swapPrice.ts']) assert.equal(fs.existsSync(path.join(PKG, 'src', 'swap', gone)), false, gone);
});
await test('the Sponsor tab takes the same tradeHost; a recipient site opens through the host, by default through the platform; the Sponsor and list node props are gone', () => {
  assert.match(wallet, /React\.createElement\(ConnectedSponsorPanel, \{ host: tradeHost \}\)/);
  assert.match(panel, /if \(host\?\.onRecipientSiteClick\) host\.onRecipientSiteClick\(href\);\n\s+else platform\.openUrl\(href\);/);
  assert.doesNotMatch(wallet, /\n  sponsorPanel\?: React\.ReactNode;/);
  assert.doesNotMatch(wallet, /\n  listHost\?: React\.ReactNode;/);
  // 2026-10-23 (docs/meritFixes.txt §11-12): sharedListHost now also passes
  // renderNetworkList/renderAccountManagement — ActiveListPanelHost's own
  // typed callback props for the two modes it can't render through its
  // generic PanelListSelectWrapper (network/account need the host's own
  // wallet/network data). Not the listHost?: React.ReactNode escape hatch
  // this test guards against above: those are two specific, typed
  // functions ActiveListPanelHost's own API requires, not an arbitrary
  // host-supplied node bypassing the shared renderer.
  assert.match(wallet, /const sharedListHost = React\.createElement\(AssetSelectListPanelHost, \{\n\s*activeChild,\n\s*walletChrome: true,\n\s*renderNetworkList,\n\s*renderAccountManagement,\n\s*\}\);/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
