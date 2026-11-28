import { type CSSProperties } from 'react';
/** Resolves with the address once the browser has the image; rejects when it cannot be loaded. Always settles. */
export declare function loadImage(src: string): Promise<string>;
/** The image, tried twice; null when it never loads. */
export declare function loadImageWithRetry(src: string, wait?: number): Promise<string | null>;
/** The missing-image icon: a framed picture with a slash. */
export declare function MissingImageIcon({ size }: {
    size?: number;
}): import("react").JSX.Element;
export default function WalletImage({ src, alt, style }: {
    src: string;
    alt: string;
    style?: CSSProperties;
}): import("react").JSX.Element;
