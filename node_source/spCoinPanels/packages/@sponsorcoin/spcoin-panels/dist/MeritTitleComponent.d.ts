import React from 'react';
export interface MeritTitleComponentProps {
    /** Icon badge shown in front of the title text. Defaults to the app's
     *  own hosted asset — override for any consumer that can't reach that
     *  origin (e.g. bundle the image locally and pass its extension/asset
     *  URL instead). */
    badgeSrc?: string;
    /** Called when the title is clicked (e.g. open an "About Merit Wallet"
     *  overlay). Omit to render a plain, non-interactive title — the correct
     *  default for any consumer with no such overlay to open yet. */
    onTitleClick?: () => void;
    /** Hide the Merit badge while retaining the title text. */
    showBadge?: boolean;
}
export default function MeritTitleComponent({ badgeSrc, onTitleClick, showBadge, }: MeritTitleComponentProps): React.JSX.Element;
