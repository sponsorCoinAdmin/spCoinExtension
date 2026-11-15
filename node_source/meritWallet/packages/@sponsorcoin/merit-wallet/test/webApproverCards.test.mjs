// File: test/webApproverCards.test.mjs
//
// Items 3, 4, 5 and 8 of docs/design/accountAuthDesign.txt section 17 on the web: ONE way to connect and disconnect a wallet (lib/spCoin/useWebApproverConnection.ts: the package's connectAccount / disconnectAccount over the authenticator registry, MetaMask handed to
// wagmi as a RECONNECT so there is no second MetaMask prompt and wagmi restores the connection on a page load), used by the wallet page's cards and Add menu (components/views/BrowserWalletPanel.tsx), the header's Connect / Disconnect
// (ConnectNetworkButton.tsx) and the main wallet's MetaMask group (AccountManagementPanel.tsx). The wallet page has one card per wallet (Merit extension, MetaMask) with Connect, Disconnect and what is connected, several accounts offered are listed on the card, and
// nothing talks to a wallet itself. Checked live with a real MetaMask (scripts/live/metamask). Run: node test/webApproverCards.test.mjs
// MUTANT=noMetaMaskCard|cardsNotGeneric|disconnectMissing|offerLost|ownConnectCode|restoredNotShown|wagmiAsksTwice|noRecentConnector|noWagmiDisconnect|noFirstIfSeveral|hookSkipsConnectAccount|headerOwnConnect|headerWagmiDisconnect|managerOwnConnect|managerWagmiDisconnect|popupOwnConnect|popupWagmiDisconnect|editHostDirect|managerExtensionDisabled|copyAlwaysShown|keyShown|orphanBack
// run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let panel = read('components', 'views', 'BrowserWalletPanel.tsx');
let hook = read('lib', 'spCoin', 'useWebApproverConnection.ts');
let header = read('components', 'views', 'Buttons', 'Connect', 'ConnectNetworkButton.tsx');
let manager = read('components', 'views', 'RadioOverlayPanels', 'AccountManagementPanel.tsx');
let popup = read('components', 'views', 'SpCoinWalletPopup.tsx');
let editHost = read('lib', 'spCoin', 'webAccountFormHost.ts');
let addHost = read('lib', 'spCoin', 'useWebAddAccountHost.ts');
let orphanExists = fs.existsSync(path.join(WEB, 'components', 'views', 'Buttons', 'Connect', 'hooks', 'useWalletActions.ts'));

if (m === 'noMetaMaskCard') panel = swap(panel, "domId: 'CONNECT_METAMASK'", "domId: 'CONNECT_OTHER'");
if (m === 'cardsNotGeneric') panel = swap(panel, '{APPROVER_CARDS.map((c) => (', '{APPROVER_CARDS.slice(0, 1).map((c) => (');
if (m === 'disconnectMissing') panel = swap(panel, '{shownConnection(c.id) ? <button className={secondary} onClick={() => void disconnectFrom(c.id)}>Disconnect</button> : null}', '');
if (m === 'offerLost') panel = swap(panel, 'if (error instanceof ConnectChoiceRequired) setOffers((prev) => ({ ...prev, [approverId]: error.accounts }));\n      else setNote(message(error));', 'setNote(message(error));');
if (m === 'ownConnectCode') panel += "\nconst direct = () => window.ethereum.request({ method: 'eth_requestAccounts' });\n";
if (m === 'restoredNotShown') panel = swap(panel, "(id === METAMASK && approvers.wagmiConnected ? approvers.wagmiAddress ?? '' : '')", "''");
if (m === 'wagmiAsksTwice') hook = swap(hook, 'await reconnectAsync({ connectors: [connector] });', 'await connectAsync({ connector });');
if (m === 'noRecentConnector') hook = swap(hook, "window.localStorage.setItem('wagmi.recentConnectorId', JSON.stringify(connector.id));", '');
if (m === 'noWagmiDisconnect') hook = swap(hook, 'if (approverId === METAMASK && wagmi.isConnected) wagmiDisconnect();', '');
if (m === 'noFirstIfSeveral') hook = swap(hook, '!options?.firstIfSeveral', 'true');
if (m === 'hookSkipsConnectAccount') hook = swap(hook, 'done = await connectAccount({ registry: webAuthenticatorRegistry, approverId, address: options?.address, host });', "done = { address: options?.address ?? '' };");
if (m === 'headerOwnConnect') header = swap(header, 'await approvers.connect(METAMASK, { firstIfSeveral: true });', 'await connectAsync({ connector: connectors[0] });');
if (m === 'headerWagmiDisconnect') header = header.replace('void approvers.disconnect(METAMASK);', 'void 0;');
if (m === 'managerOwnConnect') manager = swap(manager, 'await approvers.connect(METAMASK, { firstIfSeveral: true });', 'await connectAsync({ connector: connectors[0] });');
if (m === 'managerWagmiDisconnect') manager = swap(manager, 'void approvers.disconnect(METAMASK);', 'void 0;');
if (m === 'popupOwnConnect') popup = swap(popup, 'await approvers.connect(METAMASK, { firstIfSeveral: true });', 'await connectAsync({ connector: connectors[0] });');
if (m === 'popupWagmiDisconnect') popup = swap(popup, 'void approvers.disconnect(METAMASK);', 'void 0;');
if (m === 'editHostDirect') editHost += ' const direct = () => window.ethereum.request({ method: personal_sign });';
if (m === 'managerExtensionDisabled') manager = swap(manager, 'onConnectMeritExtension={() => void handleConnectMeritExtension()}', "unavailable_={{ connectMeritExtension: 'Connect the Merit extension from the Wallet page (/Wallet)' }}");
if (m === 'copyAlwaysShown') panel = swap(panel, "connected[MERIT_EXTENSION] && phase === 'unlocked' ?", "true ?");
if (m === 'keyShown') panel = swap(panel, "await vault.importKey(key, 'From the Merit extension');", "await vault.importKey(key, 'From the Merit extension'); setCopyNote(key);");
if (m === 'orphanBack') orphanExists = true;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the wallet page has one card per wallet it can ask: the Merit extension and MetaMask, each with its own id, words and button', () => {
  assert.match(panel, /id: MERIT_EXTENSION, title: 'Merit extension', button: 'Connect Merit extension', domId: 'CONNECT_MERIT_EXTENSION'/);
  assert.match(panel, /id: METAMASK, title: 'MetaMask', button: 'Connect MetaMask', domId: 'CONNECT_METAMASK'/);
  assert.match(panel, /\{APPROVER_CARDS\.map\(\(c\) => \(/);
});

await test('every card has Connect, Disconnect (once something is connected) and what is connected, including what wagmi restored after a page load', () => {
  assert.match(panel, /onClick=\{\(\) => void connectWith\(c\.id\)\}>\{c\.button\}<\/button>/);
  assert.match(panel, /\{shownConnection\(c\.id\) \? <button className=\{secondary\} onClick=\{\(\) => void disconnectFrom\(c\.id\)\}>Disconnect<\/button> : null\}/);
  assert.match(panel, /Connected: \{short\(shownConnection\(c\.id\)\)\}/);
  assert.match(panel, /\(id === METAMASK && approvers\.wagmiConnected \? approvers\.wagmiAddress \?\? '' : ''\)/);
});

await test('several accounts offered are listed on the wallet card, and the Add menu connect entries feed the same state', () => {
  assert.match(panel, /if \(error instanceof ConnectChoiceRequired\) setOffers\(\(prev\) => \(\{ \.\.\.prev, \[approverId\]: error\.accounts \}\)\);/);
  assert.match(panel, /const done = await approvers\.connect\(approverId\);\n\s+setConnected\(\(prev\) => \(\{ \.\.\.prev, \[approverId\]: done\.address \}\)\);/);
});

await test('the page never talks to a wallet itself: no window.ethereum request, the connect is the shared one', () => {
  assert.doesNotMatch(panel, /window\.ethereum/);
  assert.match(panel, /const approvers = useWebApproverConnection\(/);
});

await test('the ONE connect: connectAccount / disconnectAccount over the registry, the account made active with its wallet recorded', () => {
  assert.match(hook, /done = await connectAccount\(\{ registry: webAuthenticatorRegistry, approverId, address: options\?\.address, host \}\);/);
  assert.match(hook, /await disconnectAccount\(\{ registry: webAuthenticatorRegistry, approverId, host: hostFor\(approverId\) \}\);/);
  assert.match(hook, /setActiveAuthenticator: \(address, id\) => setAccountAuthenticator\(address, id\),/);
  assert.match(hook, /clearActiveAccount: \(\) => setActive\(undefined\),/);
});

await test('MetaMask is also the connector of wagmi: handed to wagmi as a RECONNECT (no second MetaMask prompt), wagmi told which connector to restore on a page load, and a disconnect disconnects wagmi too', () => {
  assert.match(hook, /await reconnectAsync\(\{ connectors: \[connector\] \}\);/);
  assert.doesNotMatch(hook, /bconnectAsync/);
  assert.match(hook, /window\.localStorage\.setItem\('wagmi\.recentConnectorId', JSON\.stringify\(connector\.id\)\);/);
  assert.match(hook, /if \(approverId === METAMASK && wagmi\.isConnected\) wagmiDisconnect\(\);/);
});

await test('an app with no account picker (the header, the main wallet) takes the first account when several are offered; the card never does', () => {
  assert.match(hook, /if \(!\(error instanceof ConnectChoiceRequired\) \|\| !options\?\.firstIfSeveral\) throw error;/);
  assert.match(header, /approvers\.connect\(METAMASK, \{ firstIfSeveral: true \}\)/);
  assert.doesNotMatch(panel, /firstIfSeveral/);
});

await test('the header Connect and Disconnect use the shared connect / disconnect, not the wagmi ones', () => {
  assert.match(header, /await approvers\.connect\(METAMASK, \{ firstIfSeveral: true \}\);/);
  assert.match(header, /onConnect=\{\(\) => void connectViaWallet\(\)\}/);
  assert.equal((header.match(/void approvers\.disconnect\(METAMASK\);/g) || []).length, 2);
  assert.doesNotMatch(header, /\bdisconnect\(\);/);
  assert.doesNotMatch(header, /connectMetaMask/);
});

await test('the main wallet connects and disconnects MetaMask through the shared one (the shared Add flow host and the wallet list); the account list has no MetaMask header badge of its own (the groups are the shared builders, lib/spCoin/webAccountGroups.ts)', () => {
  // connect: the web host of the shared add flow (docs/meritMigration.txt row 10), the one connect (useWebApproverConnection)
  assert.match(addHost, /if \(entry === 'connectMetaMask'\) await latest\.current\.approvers\.connect\(METAMASK, \{ firstIfSeveral: true \}\);/);
  // disconnect: the list's own function, the same one
  assert.match(manager, /void approvers\.disconnect\(id\)/);
  assert.doesNotMatch(manager, /metaMaskHeaderBadge|handleMetaMaskHeaderClick/);
});

await test('the main wallet Add flow connects the Merit extension WALLET (a confirmation, no account choice; the row is no longer disabled with a pointer to /Wallet), with a limit on the wait', () => {
  assert.match(addHost, /await withDeadline\(latest\.current\.approvers\.connectWallet\(MERIT_EXTENSION\), EXTENSION_HARD_WAIT_MS/);
  assert.doesNotMatch(addHost + manager, /Connect the Merit extension from the Wallet page/);
});

await test('V11: the wallet page copies an extension account into its own vault through the sealed transfer, only when the extension is connected and this wallet is unlocked, and never shows the key', () => {
  assert.match(panel, /const key = await requestAccountFromProvider\(found\.provider as TransferProvider, address\);\n\s+await vault\.importKey\(key, 'From the Merit extension'\);/);
  assert.match(panel, /c\.id === MERIT_EXTENSION && connected\[MERIT_EXTENSION\] && phase === 'unlocked' \?/);
  assert.match(panel, /Copy this account into this browser wallet/);
  assert.doesNotMatch(panel, /set(Copy)?Note\(key\)/);
});

await test('the wallet popup has no MetaMask badge of its own and no wagmi connect: its list is the shared one', () => {
  assert.doesNotMatch(popup, /metaMaskHeaderBadge|connectMetaMask|connectAsync|useConnect\b|useDisconnect/);
});

await test('the profile save (Edit / Create Account page) signs through the account\'s active authenticator, not a private window.ethereum call', () => {
  assert.match(editHost, /const authenticator = await webWallet\.authenticatorFor\(\{ address: signerAddress \}\);/);
  assert.match(editHost, /authenticator\.signMessage\(signerAddress, message, \{/);
  assert.doesNotMatch(editHost, /window as any\)\??\.ethereum|window\.ethereum|personal_sign/);
});

await test('nothing is left of the header own wagmi action hook (useWalletActions)', () => {
  assert.equal(orphanExists, false);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
