// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/MetaDetailScreen.tsx
//
// 2026-11-09 (owner: "use ACCOUNT_PANEL as a template and make the Token and Network panels operate exactly the same way"): the read-only screen of a logo and a table (TOKEN_PANEL, NETWORK_PANEL). The layout is
// DetailScreenLayout's, shared with AccountDetailScreen (the scalable image, the "<Name> Meta" toggle, the same body, spacing and table style); this file supplies the read-only parts: no upload button, the toggle alone in the
// button box, and a read-only table. The data comes in as props. TokenPanel.tsx and ConnectedNetworkPanel.tsx keep their own data logic and use this for what they show.
'use client';

import { useRef } from 'react';
import { avatarPanelClass } from '@sponsorcoin/spcoin-common/styles';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import DetailScreenLayout from './DetailScreenLayout';
import type { CachedImageKind } from '../refresh/refreshReact';
import ReadOnlyMetaDataTable, { type MetaDataRow } from '../panels/ReadOnlyMetaDataTable';

export interface MetaDetailScreenProps {
  /** The panel's own flags: TOKEN_LOGO / TOKEN_META_DATA, NETWORK_LOGO / NETWORK_META_DATA. */
  logoFlag: SP_COIN_DISPLAY;
  metaFlag: SP_COIN_DISPLAY;
  /** The element ids of the two blocks (the panel tree and the tests find them by id). */
  logoId: string;
  metaId: string;
  logoSrc: string;
  logoAlt: string;
  /** The toggle button's words ("Token Meta", "Network Meta"). */
  toggleLabel: string;
  rows: MetaDataRow[];
  /** The image cache section the logo comes from. */
  imageKind: CachedImageKind;
  /** Draw the image without the navy box (a network logo is a complete round brand mark). */
  plainLogo?: boolean;
  /** The id of the screen's own element (NETWORK_PANEL, TOKEN_PANEL): there is no box around the screen to carry it. */
  screenId?: string;
  /** The image's box follows the image's own proportions (a wide logo has no empty bands above and below it). */
  fitImageShape?: boolean;
  /** Px kept clear around the image (see DetailScreenLayout). */
  tBuffer?: number;
  bBuffer?: number;
  rBuffer?: number;
  lBuffer?: number;
}

const noop = () => undefined;

export default function MetaDetailScreen({ logoFlag, metaFlag, logoId, metaId, logoSrc, logoAlt, toggleLabel, rows, plainLogo, fitImageShape, imageKind, screenId, tBuffer, bBuffer, rBuffer, lBuffer }: MetaDetailScreenProps) {
  // the avatar panel wants a file input ref; nothing is uploaded here
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <DetailScreenLayout
      screenId={screenId}
      logoFlag={logoFlag}
      metaFlag={metaFlag}
      logoId={logoId}
      metaId={metaId}
      resizeKey={String(logoFlag)}
      toggleTrace="MetaDetailScreen:toggleMeta"
      tBuffer={tBuffer}
      bBuffer={bBuffer}
      rBuffer={rBuffer}
      lBuffer={lBuffer}
      avatar={{
        logoPreviewSrc: logoSrc,
        previewAlt: logoAlt,
        previewBoxClass: plainLogo ? avatarPanelClass.previewBoxPlain : undefined,
        connected: true,
        isEditMode: false,
        inputLocked: true,
        previewButtonLabel: '',
        loadingInputMessage: '',
        isLoading: false,
        logoFileInputRef: fileInputRef,
        onFileChange: noop,
        hideUpload: true,
        imageKind,
        fitImageShape,
        toggleLabel,
      }}
      table={<ReadOnlyMetaDataTable rows={rows} logoVisible={false} />}
    />
  );
}
