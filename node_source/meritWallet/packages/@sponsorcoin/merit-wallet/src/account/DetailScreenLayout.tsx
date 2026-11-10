// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/DetailScreenLayout.tsx
//
// 2026-11-09 (owner: "a base component to extend, to ensure uniformity"): the ONE layout of every detail screen that has a logo and a table: Account, Agent, Sponsor, Recipient (AccountDetailScreen) and Token and
// Network (MetaDetailScreen). It owns what they share, so a spacing or sizing change is made here once:
//   - the stacked body (ACTIVE_ACCOUNT_BODY: the same gap, the same -mb-[10px] edge);
//   - two independent blocks, each with its own panel flag: the logo block and the meta block (<NAME>_LOGO, <NAME>_META_DATA);
//   - the scalable image (AccountAvatarPanel: same limits, same sizing boundary, the same 18px reserve) and the rounded button box under it, with the meta toggle;
//   - the bottom padding that keeps the buttons whole when the meta block is hidden (the logo block is then the last one) and the body is the active account's, which is pulled up 10px at its edge.
// A screen supplies only what differs: the avatar's own props (the image, the upload button or none, the words of the toggle) and the meta block's content.
'use client';

import React from 'react';
import { accountDetailClass, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible, useSetPanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import AccountAvatarPanel, { type AccountAvatarPanelProps } from './form/AccountAvatarPanel';
import { RefreshBranch } from '../refresh/refreshReact';

/** What a screen decides about its avatar; everything else (sizes, buffers, the sizing boundary, the toggle's state) is the layout's. */
export type DetailAvatarProps = Pick<
  AccountAvatarPanelProps,
  'logoPreviewSrc' | 'previewAlt' | 'previewBoxClass' | 'connected' | 'isEditMode' | 'inputLocked' | 'previewButtonLabel' | 'loadingInputMessage' | 'isLoading' | 'logoFileInputRef' | 'onFileChange' | 'hideUpload' | 'toggleLabel' | 'imageKind' | 'fitImageShape'
>;

/** 2026-11-09 (owner): the space (px) kept clear around the image inside its box when a screen does not set its own: 20 above, 5 below, 20 left and right. */
export const DEFAULT_IMAGE_BUFFER = { t: 20, b: 5, l: 20, r: 20 } as const;

export interface DetailScreenLayoutProps {
  /** The panel's own flags (ACCOUNT_LOGO / ACCOUNT_META_DATA, TOKEN_LOGO / TOKEN_META_DATA, ...). */
  logoFlag: SP_COIN_DISPLAY;
  metaFlag: SP_COIN_DISPLAY;
  /** The element ids of the two blocks (the panel tree and the tests find them by id). */
  logoId: string;
  metaId: string;
  avatar: DetailAvatarProps;
  /** The meta block's content; told whether the logo block is showing above it. */
  meta: (state: { logoVisible: boolean }) => React.ReactNode;
  /** The id of the screen's outer box. */
  screenId?: string;
  /** Draw the screen as a <form> that submits here (the editable account screen); omitted: a plain box. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** The body of the ACTIVE account is pulled to the panel's edge; the other roles' is not. */
  activeBody?: boolean;
  /** Anything that changes the room for the image (it is measured again when this changes), besides the two header flags the layout watches itself. */
  resizeKey?: string;
  /** The words the panel-tree trace shows for the toggle. */
  toggleTrace: string;
  /** Optional px kept clear between the image box's edges and the image: top, bottom, right, left. A screen that sets none gets DEFAULT_IMAGE_BUFFER (top 20, bottom 5, left 20, right 20); one that sets some gets the default for the rest. */
  tBuffer?: number;
  bBuffer?: number;
  rBuffer?: number;
  lBuffer?: number;
}

export default function DetailScreenLayout({ logoFlag, metaFlag, logoId, metaId, avatar, meta, screenId, onSubmit, activeBody = true, resizeKey = '', toggleTrace, tBuffer, bBuffer, rBuffer, lBuffer }: DetailScreenLayoutProps) {
  const menuTabHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);
  const activeAccountHeaderOpen = usePanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS);
  const logoVisible = usePanelVisible(logoFlag);
  const metaVisible = usePanelVisible(metaFlag);
  const setPanelVisible = useSetPanelVisible();
  const resizeSignal = [menuTabHeaderOpen, activeAccountHeaderOpen, resizeKey].join(':');
  const body = (
    <div id="ACTIVE_ACCOUNT_BODY" className={walletPartClass.accountBody(activeBody)}>
      {logoVisible ? (
        <div id={logoId} className={metaVisible || !activeBody ? accountDetailClass.block : accountDetailClass.blockLast}>
          <AccountAvatarPanel
            panelMarginClass="mb-0 min-h-0"
            avatarPanelBorderClass=""
            avatarHeading=""
            {...avatar}
            acceptedInput="image/*"
            showImage
            showButton
            minPreviewSize={180}
            overflowMinPreviewSize={96}
            maxPreviewSize={420}
            minControlWidth={220}
            uploadControlTextClassName={walletPartClass.uploadControlText}
            previewSizeBuffer={0}
            previewHeightBuffer={8}
            sectionBottomBuffer={activeBody ? 18 : 8}
            lockSectionHeight={false}
            fillParentHeight={false}
            sizingBoundarySelector="#ACTIVE_ACCOUNT_BODY"
            resizeSignal={resizeSignal}
            imageBuffer={{ t: tBuffer ?? DEFAULT_IMAGE_BUFFER.t, b: bBuffer ?? DEFAULT_IMAGE_BUFFER.b, r: rBuffer ?? DEFAULT_IMAGE_BUFFER.r, l: lBuffer ?? DEFAULT_IMAGE_BUFFER.l }}
            toggleOn={metaVisible}
            onToggle={() => setPanelVisible(metaFlag, !metaVisible, toggleTrace)}
          />
        </div>
      ) : null}
      {metaVisible ? (
        <div id={metaId} className={accountDetailClass.block}>
          {meta({ logoVisible })}
        </div>
      ) : null}
    </div>
  );
  // the screen is a branch of the refresh tree (named by its logo block: ACCOUNT_LOGO -> ACCOUNT_PANEL); the image and any table inside it are its children
  return (
    <RefreshBranch id={logoId.replace(/_LOGO$/, '_PANEL')}>
    <div id={screenId} className={accountDetailClass.screen}>
      {onSubmit ? (
        <form onSubmit={onSubmit} className={accountDetailClass.form}>
          {body}
        </form>
      ) : (
        <div className={accountDetailClass.form}>{body}</div>
      )}
    </div>
    </RefreshBranch>
  );
}
