import React from 'react';
export interface AvatarControlsProps {
    connected: boolean;
    isEditMode: boolean;
    inputLocked: boolean;
    previewButtonLabel: string;
    loadingInputMessage: string;
    isLoading: boolean;
    logoFileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    acceptedInput: string;
    /** The class of the words inside a button. */
    textClass: string;
    /** Draw the buttons at all (the avatar panel can hide them). */
    showButton?: boolean;
    /** A READ-ONLY screen: no upload button, the toggle alone. */
    hideUpload?: boolean;
    /** The second button ("Account Meta"): a toggle; omitted = the upload button alone. */
    toggleLabel?: string;
    toggleOn?: boolean;
    onToggle?: () => void;
    /** Receives the control element (the split box, the single button or the notice). */
    controlRef?: React.MutableRefObject<HTMLElement | null>;
}
export default function AvatarControls({ connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, logoFileInputRef, onFileChange, acceptedInput, textClass, showButton, hideUpload, toggleLabel, toggleOn, onToggle, controlRef, }: AvatarControlsProps): React.JSX.Element;
