import React from 'react';
import { type CachedImageKind } from '../refresh/refreshReact';
/** What a screen decides about its picture; everything else (the limits, the boundary, the toggle's state) is the layout's. */
export interface DetailAvatarProps {
    logoPreviewSrc: string;
    previewAlt?: string;
    /** The class of the picture's box (default: the navy box); a network logo is drawn without a fill. */
    previewBoxClass?: string;
    connected: boolean;
    isEditMode: boolean;
    inputLocked: boolean;
    previewButtonLabel: string;
    loadingInputMessage: string;
    isLoading: boolean;
    logoFileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** A READ-ONLY screen (Token, Network): no upload button, the toggle alone in the same rounded button box. */
    hideUpload?: boolean;
    /** The second button of the row ("Account Meta"): a toggle; omitted = the upload button alone. */
    toggleLabel?: string;
    /** Which section of the wallet's image cache the picture comes from; omitted: the URL is shown as it is. */
    imageKind?: CachedImageKind;
    /** The picture's box takes the picture's own width-to-height proportion instead of a square. */
    fitImageShape?: boolean;
}
export interface DetailImageBlockProps extends DetailAvatarProps {
    id: string;
    /** The block is the last of the screen (the table is hidden): it carries the bottom padding that keeps the buttons whole. */
    last: boolean;
    /** Px kept clear between the box's edges and the picture. */
    imageBuffer: {
        t: number;
        b: number;
        r: number;
        l: number;
    };
    toggleOn: boolean;
    onToggle: () => void;
    /** Room kept under the block (the active body is pulled up 10px at its edge). */
    sectionBottomBuffer: number;
    /** Anything that changes the room for the picture (it is measured again when this changes). */
    resizeSignal: unknown;
}
export default function DetailImageBlock({ id, last, logoPreviewSrc, previewAlt, previewBoxClass, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, logoFileInputRef, onFileChange, hideUpload, toggleLabel, imageKind, fitImageShape, imageBuffer, toggleOn, onToggle, sectionBottomBuffer, resizeSignal, }: DetailImageBlockProps): React.JSX.Element;
