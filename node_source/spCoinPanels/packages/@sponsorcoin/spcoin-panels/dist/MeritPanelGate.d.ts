import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
interface Props {
    panel: SP_COIN_DISPLAY;
    children: React.ReactNode;
    /** if true (default), children are only mounted when the panel is visible. */
    lazyLoad?: boolean;
    /** @deprecated Use `lazyLoad={false}` instead. */
    mountAlways?: boolean;
    className?: string;
}
export default function MeritPanelGate({ panel, children, lazyLoad, mountAlways, className, }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
