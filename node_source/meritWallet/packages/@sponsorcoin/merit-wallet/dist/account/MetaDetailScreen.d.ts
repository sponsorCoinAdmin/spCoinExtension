import React from 'react';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { CachedImageKind } from '../refresh/refreshReact';
import { type MetaDataRow } from '../panels/ReadOnlyMetaDataTable';
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
export default function MetaDetailScreen({ logoFlag, metaFlag, logoId, metaId, logoSrc, logoAlt, toggleLabel, rows, plainLogo, fitImageShape, imageKind, screenId, tBuffer, bBuffer, rBuffer, lBuffer }: MetaDetailScreenProps): React.JSX.Element;
