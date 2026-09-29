import React from 'react';
import type { PanelId } from './panelState';
interface Props {
    panel: PanelId;
    children: React.ReactNode;
    /** if true (default), children are only mounted when the panel is visible. */
    lazyLoad?: boolean;
    /** @deprecated Use `lazyLoad={false}` instead. */
    mountAlways?: boolean;
    className?: string;
}
export default function MeritPanelGate({ panel, children, lazyLoad, mountAlways, className, }: Props): React.JSX.Element | null;
export {};
