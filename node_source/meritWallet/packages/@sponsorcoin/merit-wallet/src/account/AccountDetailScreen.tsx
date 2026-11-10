// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountDetailScreen.tsx
//
// docs/meritMigration.txt row 14 -- the account detail screen of the wallet (avatar, the profile table with the role chips, the Private Key row, the sponsored and staked amounts), written once in the package. It was the web app's
// AccountPanelContent: the same screen now reaches every app that imports the wallet. What differs per app comes in through AccountDetailHost, which is data and functions only: how a save is signed (the web app's keystore or
// MetaMask, the extension's vault), whether the wallet may edit right now, how a key is revealed, and how to connect a wallet. The role (the active account, a sponsor, a recipient, an agent) picks which pair of panel-tree flags
// shows the avatar and the table.
'use client';

import { useEffect, useRef, useState } from 'react';
import { accountDetailStyle } from '@sponsorcoin/spcoin-common/styles';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { RoleTableComponent, SponsoredAmountLine, StakedAmountReceivedLine } from '@sponsorcoin/spcoin-panels';
import { useAccountForm, type AccountFormHost } from './form/useAccountForm';
import AccountFormPanel from './form/AccountFormPanel';
import DetailScreenLayout from './DetailScreenLayout';
import AccountPrivateKeyRow, { HeldPrivateKeyRow } from './AccountPrivateKeyRow';
import RemoveAccountPanel from './RemoveAccountPanel';
import type { AccountSource } from './accountSource';

export interface AccountDetailHost {
  /** How a save is signed, who may edit whom, and how the picked avatar is processed. */
  form: AccountFormHost;
  /** May the wallet edit now (the web app: a wallet is connected or the keystore session is on). When false the table is read-only and offers the connect button. */
  connected: boolean;
  /** The wallet edits exactly the accounts this answers yes for (the extension: its vault's accounts); the account itself then signs. When given it replaces `connected` and `activeAddress`. */
  canEdit?(address: string): boolean;
  /** Called once after a save finishes, so the host can refresh its cached copy of the profile. */
  /** The connected account, if any (the signer of a save). */
  activeAddress?: string;
  /** A keystore session exists without a connected wallet (the web app's own keystore); the loaded selection is then kept when no address is set. */
  sessionWithoutConnection?: boolean;
  /** Reveal this account's private key; omitted = the row is not offered. With no password it may succeed from an approved cached one, else it throws PasswordRequiredError. */
  revealPrivateKey?(address: string, password?: string): Promise<string>;
  /** Which accounts may show the Private Key row (the ones this app holds keys for); omitted = all when revealPrivateKey exists. */
  canReveal?(address: string): boolean;
  /** Connect a wallet (the connect button shown while nothing is connected); omitted = no button. */
  connectWallet?(): void;
  /** 2026-11-08 (docs/design/removeAccountPlan.txt rows 5 to 7): who holds this account and whether it can be removed. An account another wallet holds: the Private Key row says "Held by <wallet>" and, when that wallet can remove accounts, a Remove button is shown. Omitted: nothing changes. */
  accountSource?(address: string, symbol?: string): Promise<AccountSource | undefined>;
  /** Called after an account was removed from here: the host leaves the screen (the account is gone from the list). */
  onAccountRemoved?(address: string): void;
}

export type AccountDetailRole = SP_COIN_DISPLAY.ACTIVE_ACCOUNT | SP_COIN_DISPLAY.SPONSOR_ACCOUNT | SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | SP_COIN_DISPLAY.AGENT_ACCOUNT;

/** The avatar and table flags of a role: each role has its own pair, so toggling one in the panel tree does not affect the others. */
export function flagsForRole(role: AccountDetailRole | undefined): [SP_COIN_DISPLAY, SP_COIN_DISPLAY] {
  if (role === SP_COIN_DISPLAY.AGENT_ACCOUNT) return [SP_COIN_DISPLAY.AGENT_LOGO, SP_COIN_DISPLAY.AGENT_META_DATA];
  if (role === SP_COIN_DISPLAY.SPONSOR_ACCOUNT) return [SP_COIN_DISPLAY.SPONSOR_LOGO, SP_COIN_DISPLAY.SPONSOR_META_DATA];
  if (role === SP_COIN_DISPLAY.RECIPIENT_ACCOUNT) return [SP_COIN_DISPLAY.RECIPIENT_LOGO, SP_COIN_DISPLAY.RECIPIENT_META_DATA];
  return [SP_COIN_DISPLAY.ACCOUNT_LOGO, SP_COIN_DISPLAY.ACCOUNT_META_DATA];
}


export default function AccountDetailScreen({ account, role = SP_COIN_DISPLAY.ACTIVE_ACCOUNT, host }: { account: spCoinAccount | undefined; role?: AccountDetailRole; host: AccountDetailHost }) {
  const [logoFlag, metaDataFlag] = flagsForRole(role);
  const address = String(account?.address ?? '').trim();
  const symbol = account?.symbol;
  // the host's source question is asked again for each account shown (the host object is rebuilt every render, so only the address starts a new ask)
  const hostRef = useRef(host);
  hostRef.current = host;
  const [source, setSource] = useState<{ address: string; value: AccountSource | undefined } | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const ask = hostRef.current.accountSource;
    if (!ask || !address) return undefined;
    void ask(address, symbol)
      .then((value) => { if (!cancelled) setSource({ address, value }); })
      .catch(() => { if (!cancelled) setSource({ address, value: undefined }); });
    return () => {
      cancelled = true;
    };
  }, [address, symbol, host.accountSource ? host.activeAddress : undefined]);
  const accountSource = source && source.address.toLowerCase() === address.toLowerCase() ? source.value : undefined;
  const editable = host.canEdit ? host.canEdit(address) : host.connected;
  const signer = host.canEdit ? address : host.activeAddress;
  const form = useAccountForm({
    connected: editable,
    activeAddress: signer,
    targetAddress: address,
    initialLogoURL: account?.logoURL,
    sessionWithoutConnection: host.sessionWithoutConnection,
    host: host.form,
  });
  if (!account) return null;

  const loadingInputMessage = 'Loading or updating account data. Input is temporarily disabled.';
  const reveal = host.revealPrivateKey;
  const showKeyRow = !!reveal && (host.canReveal ? host.canReveal(address) : true);
  // 2026-11-09 (owner): the layout (body, the two blocks, the scalable image, the button box with the toggle) is DetailScreenLayout's, shared with the Token and Network screens; this screen supplies the editable form
  return (
    <DetailScreenLayout
      screenId="ACCOUNT_INFO"
      onSubmit={form.handleSubmit}
      activeBody={role === SP_COIN_DISPLAY.ACTIVE_ACCOUNT}
      resizeKey={String(role)}
      logoFlag={logoFlag}
      metaFlag={metaDataFlag}
      logoId="ACCOUNT_LOGO"
      metaId="ACCOUNT_META_DATA"
      toggleTrace="AccountDetailScreen:toggleAccountMeta"
      avatar={{
        logoPreviewSrc: form.logoPreviewSrc,
        connected: editable,
        isEditMode: form.isEditMode,
        inputLocked: !form.isEditMode,
        previewButtonLabel: 'Select Preview Image',
        loadingInputMessage,
        isLoading: form.isLoading,
        logoFileInputRef: form.logoFileInputRef,
        onFileChange: form.handleLogoFileChange,
        toggleLabel: 'Account Meta', imageKind: 'account',
      }}
      meta={({ logoVisible }) => (
        <>
          <AccountFormPanel
            panelMarginClass={logoVisible ? 'mb-0 !h-auto !pt-0' : 'mb-0 !h-auto'}
            accountPanelBorderClass=""
            contentWidthClass="max-w-[56rem]"
            idPrefix="account-component-"
            formHeading=""
            connected={editable}
            publicKey={form.publicKey}
            publicKeyLocked
            formData={form.formData}
            errors={form.errors}
            descriptionTextareaRef={form.descriptionTextareaRef}
            inputLocked={!form.isEditMode}
            isLoading={form.isLoading}
            loadingInputMessage={loadingInputMessage}
            isSaving={form.isSaving}
            isEditMode={form.isEditMode}
            submitLabel={form.submitLabel}
            hasUnsavedChanges={form.hasUnsavedChanges}
            canCreateMissingAccount={form.canCreateMissingAccount}
            disableSubmit={form.disableSubmit}
            disableRevert={form.disableRevert}
            isRevertNoop={form.isRevertNoop}
            onPublicKeyChange={form.handlePublicKeyChange}
            onPublicKeyBlur={form.handlePublicKeyBlur}
            onChange={form.handleChange}
            onFieldBlur={form.handleFieldBlur}
            onRevert={form.handleRevertChanges}
            roleTable={<RoleTableComponent account={account} accountAddress={address} />}
            privateKeyRow={accountSource?.heldBy ? (style) => <HeldPrivateKeyRow heldBy={accountSource.heldBy!} {...style} /> : showKeyRow ? (style) => <AccountPrivateKeyRow address={address} reveal={reveal} idPrefix="account-component-" {...style} /> : undefined}
            connectButton={
              host.connectWallet ? (
                <button type="button" onClick={host.connectWallet} style={accountDetailStyle.connect}>Connect Wallet</button>
              ) : undefined
            }
            footer={accountSource?.removal ? <RemoveAccountPanel removal={accountSource.removal} account={{ address, name: account.name, symbol: account.symbol, logoURL: account.logoURL }} onRemoved={() => host.onAccountRemoved?.(address)} /> : undefined}
          />
          <SponsoredAmountLine account={account} />
          <StakedAmountReceivedLine account={account} />
        </>
      )}
    />
  );
}
