// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/MetaDetailScreen.tsx
//
// 2026-11-09 (owner: "use ACCOUNT_PANEL as a template and make the Token and Network panels operate exactly the same way"): the read-only screen of a logo and a table (TOKEN_PANEL, NETWORK_PANEL). The layout is
// DetailScreenLayout's, shared with AccountDetailScreen (the scalable image, the "<Name> Meta" toggle, the same body, spacing and table style); this file supplies the read-only parts: no upload button, the toggle alone in the
// button box, and a read-only table. The data comes in as props. TokenPanel.tsx and ConnectedNetworkPanel.tsx keep their own data logic and use this for what they show.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
import { avatarPanelClass } from '@sponsorcoin/spcoin-common/styles';
import DetailScreenLayout from './DetailScreenLayout';
import ReadOnlyMetaDataTable from '../panels/ReadOnlyMetaDataTable';
const noop = () => undefined;
export default function MetaDetailScreen({ logoFlag, metaFlag, logoId, metaId, logoSrc, logoAlt, toggleLabel, rows, plainLogo, fitImageShape, imageKind, tBuffer, bBuffer, rBuffer, lBuffer }) {
    // the avatar panel wants a file input ref; nothing is uploaded here
    const fileInputRef = useRef(null);
    return (_jsx(DetailScreenLayout, { logoFlag: logoFlag, metaFlag: metaFlag, logoId: logoId, metaId: metaId, resizeKey: String(logoFlag), toggleTrace: "MetaDetailScreen:toggleMeta", tBuffer: tBuffer, bBuffer: bBuffer, rBuffer: rBuffer, lBuffer: lBuffer, avatar: {
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
        }, meta: () => _jsx(ReadOnlyMetaDataTable, { rows: rows, logoVisible: false }) }));
}
