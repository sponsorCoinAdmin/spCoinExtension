// Source-pinned tests for ActiveAccountSelectDropDown (owner, 2026-11-11): a left click first makes the shown account the active one (the host's injected onActivate), then hands over to AccountSelectDropDown's own actions; the generic AccountSelectDropDown never activates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8').replace(/\r\n/g, '\n');
const active = read('panels', 'ActiveAccountSelectDropDown.tsx');
assert.match(active, /<AccountSelectDropDown\n\s+rootId="WALLET_ACCOUNT_HEADER"/, 'it extends the portable AccountSelectDropDown');
assert.ok(!/<AssetSelectDropDown/.test(active), 'not built beside it on AssetSelectDropDown any more');
assert.match(active, /onSelectClick=\{onSelectClick \|\| onActivate \? \(\) => \{ activate\(\); onSelectClick\?\.\(\); \} : undefined\}/, 'pill click: activate, then the dropdown action');
assert.match(active, /onIconClick=\{onIconClick \|\| onActivate \? \(\) => \{ activate\(\); onIconClick\?\.\(address \?\? ''\); \} : undefined\}/, 'avatar click: activate, then the dropdown action');
assert.match(active, /activeAccountSelect:activateFailed/, 'a failed activation is traced and the click goes on');
assert.match(read('panels', 'WalletAccountHeader.tsx'), /onActivate=\{onActivate\}/, 'the header passes onActivate to the pill');
const panels = path.join(SRC, '..', '..', '..', '..', '..', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src');
const hosted = fs.readFileSync(path.join(panels, 'containers', 'dropdowns', 'AccountSelectDropDown.tsx'), 'utf8');
assert.match(hosted, /activate=\{false\}/, 'the generic dropdown never makes an account active');
const avatar = fs.readFileSync(path.join(panels, 'containers', 'account', 'AccountAvatarWithOpen.tsx'), 'utf8');
assert.match(avatar, /!activate && mode === SP_COIN_DISPLAY\.ACTIVE_ACCOUNT/, 'an ACTIVE_ACCOUNT avatar click does nothing when activation is not allowed');
console.log('PASS ActiveAccountSelectDropDown activates then delegates; AccountSelectDropDown never activates');

// 2026-11-11 (owner): a right click on the avatar opens ACCOUNT_PANEL for that account, without making it active; ActiveAccountSelectDropDown hands it to AccountSelectDropDown
assert.match(hosted, /requestAccountDetail\(address\)/, 'the generic dropdown asks the wallet to open the account details');
assert.match(hosted, /openAccountComponent\(\{ account: recipientAccount, mode, activate: false/, 'with no wallet it falls back without activating');
assert.match(active, /onIconContextMenu=\{onIconContextMenu \? \(\) => onIconContextMenu\(address \?\? ''\) : undefined\}/, 'the active pill passes the right click to AccountSelectDropDown');
assert.match(read('MeritWallet.tsx'), /registerAccountDetailOpener\(\(address\) => openAccountDetailRef\.current\(address\)\)/, 'the wallet registers how it opens an account');
assert.match(read('MeritWallet.tsx'), /onIconContextMenu=\{\(address\) => \{ if \(address\) openAccountDetail\(address\); \}\}/, 'the header pill opens the details on a right click');
console.log('PASS a right click on an account avatar opens ACCOUNT_PANEL without activating');

// 2026-11-11 (owner): a copied private key leaves the clipboard again after 60 seconds, from a module-level timer
const clear = read('panels', 'clipboardClear.ts');
assert.match(clear, /CLIPBOARD_KEY_MS = 60_000/);
assert.match(read('panels', 'MessagePanelReal.tsx'), /scheduleClipboardClear\(platform, key\)/, 'a copy schedules the clear');
assert.match(read('platform', 'domPlatform.ts'), /async clearClipboard\(text, replacement = ''\)/, 'the platform clears it');
console.log('PASS a copied private key is cleared from the clipboard after 60 seconds');
assert.match(clear, /KEY_COPY_TIMEOUT_TEXT = 'Key Copy Time out'/, 'the clipboard says why the key is gone');
console.log('PASS the clipboard is left saying "Key Copy Time out"');

// 2026-11-11 (owner report): backing out of the Remove confirmation must show the account that was open, not the active account
const wallet = read('MeritWallet.tsx');
assert.match(wallet, /if \(accountDetailVisible \|\| messageVisible\) return undefined;/, 'the open account is kept while a message (the confirmation) is up');
assert.match(wallet, /\}, 60\);\n\s+return \(\) => clearTimeout\(timer\);\n\s+\}, \[accountDetailVisible, messageVisible\]\);/, 'and forgotten only a beat after neither shows');
console.log('PASS the open account survives the Remove confirmation');

// 2026-11-11 (owner): the SELECTED account. ExchangeContext holds it and persists it; AccountSelectDropDown sets it; ActiveAccountSelectDropDown activates, then hands over to AccountSelectDropDown, which sets it
const engine = path.join(SRC, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src');
const common = path.join(SRC, '..', '..', '..', '..', '..', 'spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common', 'src');
const eng = (...p) => fs.readFileSync(path.join(engine, ...p), 'utf8');
assert.match(fs.readFileSync(path.join(common, 'context', 'types.ts'), 'utf8'), /selectedAccount\?: spCoinAccount;/, 'part of the accounts of ExchangeContext');
assert.match(eng('structure', 'ExchangeInitialContext.ts'), /selectedAccount: undefined/);
assert.match(eng('structure', 'ExchangeSanitizeHelpers.ts'), /selectedAccount: rawAccounts\?\.selectedAccount/, 'survives a reload (sanitize)');
assert.match(eng('structure', 'accountPersistence.ts'), /selectedAccount: toPersistedAccountRef\(src\.selectedAccount\)/, 'persisted as an address reference');
assert.match(eng('structure', 'accountProjection.ts'), /syncSingle\('selectedAccount', 'slot:selected'\)/, 'one record per address, like the other slots');
assert.match(eng('structure', 'initExchangeContext.ts'), /accounts\.selectedAccount,\n/, 'hydrated at boot');
assert.match(eng('index.ts'), /useSelectedAccount/, 'the hook is exported');
const portable = fs.readFileSync(path.join(panels, 'AccountSelectDropDown.tsx'), 'utf8').replaceAll(String.fromCharCode(13, 10), String.fromCharCode(10));
assert.match(portable, /onSelected\?\.\(\);\n\s+onSelectClick\?\.\(e\);/, 'the portable dropdown reports the selection first, then runs onSelectClick');
assert.match(hosted, /onSelected=\{recipientAccount && address \? \(\) => setSelectedAccount\(recipientAccount\) : undefined\}/, 'AccountSelectDropDown sets the selected account');
assert.match(active, /onSelected=\{address \? \(\) => setSelectedAccount\(buildSpCoinAccount/, 'the active dropdown hands to it, and the selection is set');
console.log('PASS selectedAccount: ExchangeContext, persisted, set by AccountSelectDropDown after ActiveAccountSelectDropDown activates');
