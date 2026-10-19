// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountDetailScreen.tsx
//
// docs/meritMigration.txt row 14 -- the account detail screen of the wallet (avatar, the profile table with the role chips, the Private Key row, the sponsored and staked amounts), written once in the package. It was the web app's
// AccountPanelContent: the same screen now reaches every app that imports the wallet. What differs per app comes in through AccountDetailHost, which is data and functions only: how a save is signed (the web app's keystore or
// MetaMask, the extension's vault), whether the wallet may edit right now, how a key is revealed, and how to connect a wallet. The role (the active account, a sponsor, a recipient, an agent) picks which pair of panel-tree flags
// shows the avatar and the table.
'use client';

import { accountDetailClass, accountDetailStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useEffect, useRef } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { setAccountStoreBaseUrl, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { RoleTableComponent, SponsoredAmountLine, StakedAmountReceivedLine } from '@sponsorcoin/spcoin-panels';
import { useAccountForm, type AccountFormHost } from './form/useAccountForm';
import AccountFormPanel from './form/AccountFormPanel';
import AccountAvatarPanel from './form/AccountAvatarPanel';
import AccountPrivateKeyRow from './AccountPrivateKeyRow';
import type { ProfileFormData } from './profileForm';

export interface AccountDetailHost {
  /** How a save is signed, who may edit whom, and how the picked avatar is processed. */
  form: AccountFormHost;
  /** May the wallet edit now (the web app: a wallet is connected or the keystore session is on). When false the table is read-only and offers the connect button. */
  connected: boolean;
  /** The wallet edits exactly the accounts this answers yes for (the extension: its vault's accounts); the account itself then signs. When given it replaces `connected` and `activeAddress`. */
  canEdit?(address: string): boolean;
  /** Called once after a save finishes, so the host can refresh its cached copy of the profile. */
  onSaved?(address: string, saved: ProfileFormData, avatarChanged: boolean): void;
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
  const menuTabHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
  const activeAccountHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS);
  const [logoFlag, metaDataFlag] = flagsForRole(role);
  const logoVisible = usePanelVisible(logoFlag);
  const metaDataVisible = usePanelVisible(metaDataFlag);
  const address = String(account?.address ?? '').trim();
  const editable = host.canEdit ? host.canEdit(address) : host.connected;
  const signer = host.canEdit ? address : host.activeAddress;
  useEffect(() => {
    if (host.form.baseUrl !== undefined) setAccountStoreBaseUrl(host.form.baseUrl);
  }, [host.form.baseUrl]);
  const form = useAccountForm({
    connected: editable,
    activeAddress: signer,
    targetAddress: address,
    initialLogoURL: account?.logoURL,
    sessionWithoutConnection: host.sessionWithoutConnection,
    host: host.form,
  });
  const hostRef = useRef(host);
  hostRef.current = host;
  const savedOnce = useRef(false);
  useEffect(() => {
    // After a save the form's baseline equals what was typed; tell the host once per save so it refreshes its cached copy.
    if (!form.isSaving && form.accountExists && !form.hasUnsavedChanges && savedOnce.current) {
      savedOnce.current = false;
      hostRef.current.onSaved?.(address, form.formData, true);
    }
    if (form.isSaving) savedOnce.current = true;
  }, [form.isSaving, form.accountExists, form.hasUnsavedChanges, form.formData, address]);
  if (!account) return null;

  const loadingInputMessage = 'Loading or updating account data. Input is temporarily disabled.';
  const reveal = host.revealPrivateKey;
  const showKeyRow = !!reveal && (host.canReveal ? host.canReveal(address) : true);
  const avatarResizeSignal = [menuTabHeaderOpen, activeAccountHeaderOpen, role].join(':');
  return (
    <div id="ACCOUNT_INFO" className={accountDetailClass.screen}>
      <form onSubmit={form.handleSubmit} className={accountDetailClass.form}>
        <div
          id="ACTIVE_ACCOUNT_BODY"
          className={walletPartClass.accountBody(role === SP_COIN_DISPLAY.ACTIVE_ACCOUNT)}
        >
          {logoVisible ? (
            <div id="ACCOUNT_LOGO" className={accountDetailClass.block}>
              <AccountAvatarPanel
                panelMarginClass="mb-0 min-h-0"
                avatarPanelBorderClass=""
                avatarHeading=""
                logoPreviewSrc={form.logoPreviewSrc}
                connected={editable}
                isEditMode={form.isEditMode}
                inputLocked={!form.isEditMode}
                previewButtonLabel="Select Preview Image"
                loadingInputMessage={loadingInputMessage}
                isLoading={form.isLoading}
                acceptedInput="image/*"
                logoFileInputRef={form.logoFileInputRef}
                onFileChange={form.handleLogoFileChange}
                showImage
                showButton
                minPreviewSize={180}
                overflowMinPreviewSize={96}
                maxPreviewSize={420}
                minControlWidth={220}
                uploadControlTextClassName={walletPartClass.uploadControlText}
                previewSizeBuffer={0}
                previewHeightBuffer={8}
                sectionBottomBuffer={0}
                lockSectionHeight={false}
                fillParentHeight={false}
                sizingBoundarySelector="#ACTIVE_ACCOUNT_BODY"
                resizeSignal={avatarResizeSignal}
              />
            </div>
          ) : null}
          {metaDataVisible ? (
            <div id="ACCOUNT_META_DATA" className={accountDetailClass.block}>
              <AccountFormPanel
                panelMarginClass="mb-0 !h-auto"
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
                privateKeyRow={showKeyRow ? (style) => <AccountPrivateKeyRow address={address} reveal={reveal} idPrefix="account-component-" {...style} /> : undefined}
                connectButton={
                  host.connectWallet ? (
                    <button type="button" onClick={host.connectWallet} style={accountDetailStyle.connect}>Connect Wallet</button>
                  ) : undefined
                }
              />
              <SponsoredAmountLine account={account} />
              <StakedAmountReceivedLine account={account} />
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
