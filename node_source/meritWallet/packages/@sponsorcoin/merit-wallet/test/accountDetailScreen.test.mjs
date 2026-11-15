// File: test/accountDetailScreen.test.mjs
//
// docs/meritMigration.txt row 14: the account detail screen is written once in the package (src/account/AccountDetailScreen.tsx, with the Private Key row in AccountPrivateKeyRow.tsx). A host passes data and functions only (AccountDetailHost);
// each role has its own pair of panel-tree flags; the Private Key row is offered only when the host can reveal and the account is one it holds keys for; a reveal is tried without a password first and the password dialog opens only when the host asks for it.
// Run: node test/accountDetailScreen.test.mjs
// MUTANT=roleFlagsShared|rowAlwaysOn|revealPasswordFirst|noDialogOnRequired|dialogOnAnyError|noHide|hostNodeProp|dialogIsAForm run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let screen = read(PKG, 'src', 'account', 'AccountDetailScreen.tsx');
let row = read(PKG, 'src', 'account', 'AccountPrivateKeyRow.tsx');
const index = read(PKG, 'src', 'index.ts');
let dialog = read(PKG, 'src', 'PasswordPromptDialog.tsx');
if (m === 'roleFlagsShared') screen = swap(screen, "if (role === SP_COIN_DISPLAY.AGENT_ACCOUNT) return [SP_COIN_DISPLAY.AGENT_LOGO, SP_COIN_DISPLAY.AGENT_META_DATA];", '');
if (m === 'rowAlwaysOn') screen = swap(screen, "const showKeyRow = !!reveal && (host.canReveal ? host.canReveal(address) : true);", 'const showKeyRow = true;');
if (m === 'revealPasswordFirst') row = swap(row, 'setKey(await reveal(address));', "setKey(await reveal(address, ''));");
if (m === 'noDialogOnRequired') row = swap(row, 'if (isPasswordRequired(e)) setMode', 'if (false) setMode');
if (m === 'dialogOnAnyError') row = swap(row, 'if (isPasswordRequired(e)) setMode', 'if (true) setMode');
if (m === 'noHide') row = swap(row, 'onClick={hide} className={`${inputClasses} cursor-pointer`}', 'className={`${inputClasses} cursor-pointer`}');
if (m === 'dialogSubmitBubbles') dialog = swap(dialog, '          e.stopPropagation();\n', '');
if (m === 'hostNodeProp') screen = swap(screen, '  connectWallet?(): void;', '  connectWallet?(): void;\n  privateKeyRowNode?: React.ReactNode;');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the host contract is data and functions only (no React node), and the screen is exported', () => {
  const contract = screen.slice(screen.indexOf('export interface AccountDetailHost'), screen.indexOf('export type AccountDetailRole'));
  assert.doesNotMatch(contract, /React\.ReactNode|JSX\.Element/);
  for (const member of ['form: AccountFormHost;', 'connected: boolean;', 'revealPrivateKey?(address: string, password?: string): Promise<string>;', 'canReveal?(address: string): boolean;', 'connectWallet?(): void;']) assert.ok(contract.includes(member), member);
  assert.match(index, /AccountDetailScreen/);
  assert.match(index, /PasswordRequiredError/);
});
await test('each role has its own avatar and table flags', () => {
  for (const [role, a, b] of [['AGENT_ACCOUNT', 'AGENT_LOGO', 'AGENT_META_DATA'], ['SPONSOR_ACCOUNT', 'SPONSOR_LOGO', 'SPONSOR_META_DATA'], ['RECIPIENT_ACCOUNT', 'RECIPIENT_LOGO', 'RECIPIENT_META_DATA']]) {
    assert.ok(screen.includes(`if (role === SP_COIN_DISPLAY.${role}) return [SP_COIN_DISPLAY.${a}, SP_COIN_DISPLAY.${b}];`), role);
  }
});
await test('the Private Key row is offered only when the host can reveal and the account is one it holds', () => {
  assert.match(screen, /const showKeyRow = !!reveal && \(host\.canReveal \? host\.canReveal\(address\) : true\);/);
  // 2026-11-08: an account ANOTHER wallet holds shows "Held by <wallet>" in this row first (removeAccount.test.mjs); the reveal rule is unchanged for every other account
  assert.match(screen, /privateKeyRow=\{accountSource\?\.heldBy \? .* : showKeyRow \? /);
});
await test('a reveal is tried without a password first; the dialog opens only when the host asks for the password', () => {
  assert.match(row, /setKey\(await reveal\(address\)\);/);
  assert.match(row, /if \(isPasswordRequired\(e\)\) setMode\('confirming'\);\n\s+else setError/);
  assert.match(row, /setKey\(await reveal\(address, password\)\);/);
});
await test('the revealed key hides again on a click and with the Hide button', () => {
  assert.match(row, /title="Click to hide" onClick=\{hide\}/);
  assert.match(row, /onClick=\{hide\} className=\{privateKeyRowClass\.hide\}>Hide/);
});

await test('the password dialog has no <form> and no submit button: inside the account form a native submit reloaded the extension page and could run the profile save', () => {
  assert.doesNotMatch(dialog, /<form|<\/form>|type="submit"/);
  assert.match(dialog, /<button type="button" onClick=\{submit\}/);
  assert.match(dialog, /if \(e\.key === 'Enter'\) \{\n\s+e\.preventDefault\(\);\n\s+submit\(\);/);
});

const blockSrc = () => read(PKG, 'src', 'account', 'DetailImageBlock.tsx');
const hookSrc = () => read(PKG, 'src', 'account', 'form', 'useAvatarPreviewSize.ts');

await test('2026-11-09 (owner): ONE base layout (DetailScreenLayout) draws every logo-and-table detail screen: Account, Agent, Sponsor, Recipient (AccountDetailScreen) and Token, Network (MetaDetailScreen); the screens only supply what differs', () => {
  const layout = read(PKG, 'src', 'account', 'DetailScreenLayout.tsx');
  const meta = read(PKG, 'src', 'account', 'MetaDetailScreen.tsx');
  assert.match(screen, /<DetailScreenLayout\s+screenId="ACCOUNT_INFO"/);
  assert.match(meta, /<DetailScreenLayout\s/);
  for (const text of [screen, meta]) assert.doesNotMatch(text, /<AccountAvatarPanel|<DetailImageBlock|accountBody\(|id="ACTIVE_ACCOUNT_BODY"/, 'the layout is not copied into a screen');
  // the layout owns the body, the two flagged blocks and the toggle; the picture block is DetailImageBlock
  assert.match(layout, /id="ACTIVE_ACCOUNT_BODY" className=\{walletPartClass\.accountBody\(activeBody\)\}/);
  assert.match(layout, /usePanelVisible\(logoFlag\)/);
  assert.match(layout, /usePanelVisible\(metaFlag\)/);
  assert.match(layout, /onToggle=\{\(\) => setPanelVisible\(metaFlag, !metaVisible, toggleTrace\)\}/);
  assert.match(layout, /<DetailImageBlock\s+id=\{logoId\}/);
  assert.doesNotMatch(layout, /import .*AccountAvatarPanel|<AccountAvatarPanel/);
  // the shared limits live in the block
  assert.match(blockSrc(), /minPreviewSize: 180,/);
  assert.match(blockSrc(), /maxPreviewSize: 420,/);
  assert.match(blockSrc(), /sizingBoundarySelector: '#ACTIVE_ACCOUNT_BODY',/);
});

await test('2026-11-09 (owner: no unnecessary wrappers): from the screen to the picture there is the screen (the <form> itself when it submits), the body, the logo block, the picture box, the picture: no section, column, stage, controls or button-wrap boxes', () => {
  const layout = read(PKG, 'src', 'account', 'DetailScreenLayout.tsx');
  assert.match(layout, /<form id=\{screenId\} onSubmit=\{onSubmit\} className=\{accountDetailClass\.screen\}>\s+\{body\}/);
  assert.doesNotMatch(layout, /accountDetailClass\.form/);
  const block = blockSrc();
  assert.match(block, /<div id=\{id\} ref=\{blockRef\} className=\{last \? accountDetailClass\.imageBlockLast : accountDetailClass\.imageBlock\}>\s+<AvatarPicture/);
  assert.match(block, /<AvatarControls\s/);
  assert.match(read(PKG, 'src', 'account', 'form', 'AccountAvatarPanel.tsx'), /<AvatarPicture\s[\s\S]*<AvatarControls\s/, 'the avatar panel draws the same two pieces: the button row exists once');
  assert.doesNotMatch(block, /avatarPanelClass\.(section|column|stage|controls)\b/);
  assert.doesNotMatch(block, /<div className=\{avatarPanelClass\.buttonWrap\}>/, 'the button row is not wrapped again');
  assert.doesNotMatch(block, /<section/);
  // the avatar panel (the web's Edit / Create Account pages) keeps its structure and its own sizing
  const panel = read(PKG, 'src', 'account', 'form', 'AccountAvatarPanel.tsx');
  assert.match(panel, /avatarPanelClass\.column\(fillParentHeight\)/);
  assert.match(panel, /ref=\{previewStageRef\} className=\{avatarPanelClass\.stage\}/);
});

await test('2026-11-09 (owner): the top yellow button is split; the second half is "Account Meta" for an account (a toggle of the role\'s meta flag), "Token Meta" and "Network Meta" for the read-only screens', () => {
  assert.match(screen, /toggleLabel: 'Account Meta'/);
  assert.match(screen, /logoFlag=\{logoFlag\}\s+metaFlag=\{metaDataFlag\}/);
  const block = blockSrc();
  const controls = read(PKG, 'src', 'account', 'form', 'AvatarControls.tsx');
  assert.match(controls, /avatarPanelClass\.splitUpload\(isUploadHovered\)/);
  assert.match(controls, /aria-pressed=\{toggleOn\}/);
  assert.match(controls, /\{hideUpload \? null : upload\(avatarPanelClass\.splitUpload\(isUploadHovered\)\)\}/);
  const token = read(PKG, 'src', 'TokenPanel.tsx');
  const network = read(PKG, 'src', 'ConnectedNetworkPanel.tsx');
  assert.match(token, /logoFlag=\{SP_COIN_DISPLAY\.TOKEN_LOGO\}\s+metaFlag=\{SP_COIN_DISPLAY\.TOKEN_META_DATA\}/);
  assert.match(token, /toggleLabel="Token Meta"/);
  assert.match(network, /logoFlag=\{SP_COIN_DISPLAY\.NETWORK_LOGO\}\s+metaFlag=\{SP_COIN_DISPLAY\.NETWORK_META_DATA\}/);
  assert.match(network, /toggleLabel="Network Meta"/);
  assert.match(network, /plainLogo/);
});
await test('2026-11-09 (owner): with the meta block hidden the logo block is the last one and gets the bottom padding that gives back the active body\'s -mb-[10px]; the image reserves the same room in both states', () => {
  const layout = read(PKG, 'src', 'account', 'DetailScreenLayout.tsx');
  assert.match(layout, /last=\{!metaVisible && activeBody\}/);
  assert.match(layout, /sectionBottomBuffer=\{activeBody \? 18 : 8\}/);
  const styles = fs.readFileSync(path.join(PKG, '..', '..', '..', '..', 'spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common', 'src', 'styles', 'meritWalletStyles.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(styles, /imageBlockLast: 'flex shrink-0 flex-col items-center overflow-visible pb-\[18px\]'/);
});

await test('2026-11-09 (owner): the image is sized from the screen (or the frame\'s max-height), never from the content-sized boxes around it, so hiding Account Meta does not shrink it; the PANEL scrolls, the table does not (one rule, in useAvatarPreviewSize, used by the block and by the avatar panel)', () => {
  const hook = hookSrc();
  assert.match(hook, /const contentSized = frameIndex >= 0;/);
  assert.match(hook, /frameMaxBottom - \(frame\.rect\.bottom - ancestor\.rect\.bottom\)/);
  assert.match(hook, /const sizingBottom = contentSized \? clipBottom : Math\.min\(measuredBoundaryBottom, clipBottom\);/);
  assert.match(hook, /contentSized \? sizingBottom - boundaryRect\.top : Math\.min\(boundary\.clientHeight/);
  assert.match(hook, /sizingAncestors\.indexOf\(ancestor\) <= frameIndex \? frameMaxBottom - \(frame\.rect\.bottom - ancestor\.rect\.bottom\) : ancestor\.rect\.bottom/);
  assert.match(read(PKG, 'src', 'account', 'form', 'AccountAvatarPanel.tsx'), /useAvatarPreviewSize\(/);
  assert.match(blockSrc(), /useAvatarPreviewSize\(/);
  assert.doesNotMatch(read(PKG, 'src', 'account', 'form', 'AccountAvatarPanel.tsx'), /ResizeObserver|getSizingAncestors/, 'the sizing is not copied into the panel');
  // no scrolling table (owner): the screen is as tall as its content and the shared scroller holds it, as before
  const styles = fs.readFileSync(path.join(PKG, '..', '..', '..', '..', 'spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common', 'src', 'styles', 'meritWalletStyles.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(styles, /screen: 'flex min-h-full shrink-0 flex-col bg-\[#0b0e19\]'/);
  assert.doesNotMatch(styles, /spcoinDetailScreen|:has\(> /);
  assert.doesNotMatch(styles, /detailPictureStyle|DETAIL_PICTURE_M|detailBlockStyle/);
});

await test('2026-11-09 (owner): the layout takes optional tBuffer/bBuffer/rBuffer/lBuffer (px clear around the image, inside its box); one not set is DEFAULT_IMAGE_BUFFER: top 20, bottom 5, left 20, right 20', () => {
  const layout = read(PKG, 'src', 'account', 'DetailScreenLayout.tsx');
  assert.match(layout, /tBuffer\?: number;\s+bBuffer\?: number;\s+rBuffer\?: number;\s+lBuffer\?: number;/);
  assert.match(layout, /export const DEFAULT_IMAGE_BUFFER = \{ t: 20, b: 5, l: 20, r: 20 \} as const;/);
  assert.match(layout, /imageBuffer=\{\{ t: tBuffer \?\? DEFAULT_IMAGE_BUFFER\.t, b: bBuffer \?\? DEFAULT_IMAGE_BUFFER\.b, r: rBuffer \?\? DEFAULT_IMAGE_BUFFER\.r, l: lBuffer \?\? DEFAULT_IMAGE_BUFFER\.l \}\}/);
  assert.match(blockSrc(), /avatarPreviewStyle\(previewSize, imageBuffer, fitImageShape \? aspect : undefined\)/);
  assert.match(read(PKG, 'src', 'account', 'MetaDetailScreen.tsx'), /lBuffer=\{lBuffer\}/);
  // the network screen relies on the defaults: it sets none of its own
  assert.doesNotMatch(read(PKG, 'src', 'ConnectedNetworkPanel.tsx'), /[tblr]Buffer=/);
});

await test('2026-11-09 (owner): the detail screen\'s image is a cache recall: read through the wallet\'s image cache (the section of its kind), and Refresh forces the entry to be fetched into that cache again', () => {
  const react = read(PKG, 'src', 'refresh', 'refreshReact.tsx');
  const wallet = read(PKG, 'src', 'MeritWallet.tsx');
  assert.match(wallet, /<RefreshTreeProvider tree=\{refreshTree\} refreshToken=\{refreshToken \?\? 0\} onDone=\{setTreeDoneToken\}>/);
  assert.match(wallet, /refreshing=\{refreshBusy\}/);
  assert.match(wallet, /<ImageCacheContext\.Provider value=\{imageCacheValue\}>/);
  assert.match(wallet, /caches: iconCachesRef\.current!, baseUrl: baseUrl \?\? ''/);
  assert.match(blockSrc(), /const previewSrc = useCachedImage\(logoPreviewSrc, imageKind\);/);
  assert.match(blockSrc(), /src=\{previewSrc\}/);
  assert.match(read(PKG, 'src', 'account', 'DetailScreenLayout.tsx'), /<RefreshBranch id=\{logoId\.replace\(\/_LOGO\$\/, '_PANEL'\)\}>/);
  // read through the cache (not forced) on show, forced on refresh; announced changes read again; never the browser's fetch
  assert.match(react, /section\(src, baseUrl, false\)/);
  assert.match(react, /section\(src, baseUrl, true\)/);
  assert.match(react, /platform\.onImageCacheUpdated\?\.\(read\)/);
  assert.doesNotMatch(react, /fetch\(/);
  // each screen names its section
  assert.match(screen, /imageKind: 'account'/);
  assert.match(read(PKG, 'src', 'TokenPanel.tsx'), /imageKind="token"/);
  assert.match(read(PKG, 'src', 'ConnectedNetworkPanel.tsx'), /imageKind="network"/);
});

await test('2026-11-09 (owner): a logo screen can ask for the image\'s box to follow the image\'s own proportions (the network screen does), so a wide logo has no empty bands above and below it; every other screen keeps the square', () => {
  const block = blockSrc();
  const hook = hookSrc();
  assert.match(block, /fitImageShape = false,/);
  assert.match(block, /const aspect = fitImageShape \? imageAspect : 1;/);
  assert.match(hook, /\(availableHeight - \(imageBuffer\?\.t \?\? 0\) - \(imageBuffer\?\.b \?\? 0\)\) \* aspect \+ \(imageBuffer\?\.l \?\? 0\) \+ \(imageBuffer\?\.r \?\? 0\)/);
  assert.match(hook, /Math\.min\(availableWidth, fitWidthFromHeight, maxPreviewSize\)/);
  assert.match(block, /setImageAspect\(naturalWidth \/ naturalHeight\)/);
  assert.match(read(PKG, 'src', 'account', 'MetaDetailScreen.tsx'), /fitImageShape,\s+toggleLabel/);
  assert.match(read(PKG, 'src', 'ConnectedNetworkPanel.tsx'), /plainLogo\s+fitImageShape/);
  assert.doesNotMatch(read(PKG, 'src', 'TokenPanel.tsx'), /fitImageShape/);
});

await test('2026-11-09 (owner: no unnecessary wrappers): the Network and Token screens have no box around the screen; the panel\'s id is on the screen element itself (screenId), and only the empty state keeps its own <div id>', () => {
  const network = read(PKG, 'src', 'ConnectedNetworkPanel.tsx');
  const token = read(PKG, 'src', 'TokenPanel.tsx');
  assert.match(network, /<MetaDetailScreen\s+screenId="NETWORK_PANEL"/);
  assert.match(token, /<MetaDetailScreen\s+screenId="TOKEN_PANEL"/);
  assert.equal((network.match(/<div id="NETWORK_PANEL">/g) || []).length, 1, 'only the empty state');
  assert.equal((token.match(/<div id="TOKEN_PANEL">/g) || []).length, 1, 'only the empty state');
  assert.match(read(PKG, 'src', 'account', 'MetaDetailScreen.tsx'), /screenId=\{screenId\}/);
});

await test('2026-11-09 (owner): a detail panel that is open in the panel tree is drawn even with nothing previewed: TOKEN_PANEL and NETWORK_PANEL are drawn whenever they are visible (the screen shows its own notice or the live data)', () => {
  const wallet = read(PKG, 'src', 'MeritWallet.tsx');
  assert.match(wallet, /const tokenDetailOverlay = tokenDetailVisible \? React\.createElement\(TokenPanel, \{\}\) : null;/);
  assert.match(wallet, /const networkDetailOverlay = networkDetailVisible \? React\.createElement\(ConnectedNetworkPanel, \{\}\) : null;/);
  assert.doesNotMatch(wallet, /tokenDetailVisible && previewTokenAddress/);
  // the account and role panels are never blank either: each says what is missing
  assert.match(wallet, /: accountDetailVisible\s+\? React\.createElement\('div', \{ style: walletFrameStyle\.roleEmpty \}, 'No account selected\.'\)/);
  for (const words of ['No agent selected.', 'No sponsor selected.', 'No recipient selected.']) assert.ok(wallet.includes(words), words);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
