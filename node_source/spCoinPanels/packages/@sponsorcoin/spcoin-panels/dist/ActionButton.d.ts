import type { ReactNode } from 'react';
export type ActionButtonBgClass = 'bg-[#243056]' | 'bg-[#501505]' | 'bg-[#1f3e1d]' | 'bg-orange-600';
export interface ActionButtonProps {
    id?: string;
    text: ReactNode;
    bgClass: ActionButtonBgClass;
    onClick?: () => void;
    disabled?: boolean;
    /** true while a transaction is in flight — disabled but hover-reactive. */
    busy?: boolean;
    /** Rendered as an absolutely-positioned overlay (sibling of <button>,
      * not child — a button cannot nest another interactive element). */
    endAdornment?: ReactNode;
    /** Hover-warn affordance — throbs text, optionally replacing it on hover. */
    warnOnHover?: boolean;
    hoverText?: ReactNode;
}
export default function ActionButton({ id, text, bgClass, onClick, disabled, busy, endAdornment, warnOnHover, hoverText, }: ActionButtonProps): import("react").JSX.Element;
