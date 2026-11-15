import React from 'react';
export interface AvatarPictureProps {
    boxClass: string;
    boxStyle: React.CSSProperties;
    /** Is there a picture to show? (the URL below may be an image-cache answer that is not there yet) */
    hasImage: boolean;
    src: string;
    alt: string;
    onLoad?: React.ReactEventHandler<HTMLImageElement>;
}
export default function AvatarPicture({ boxClass, boxStyle, hasImage, src, alt, onLoad }: AvatarPictureProps): React.JSX.Element;
