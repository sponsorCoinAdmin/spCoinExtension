import type { ReactNode } from 'react';
import type { BUTTON_TYPE } from '@sponsorcoin/spcoin-common/context';
import { type ActionButtonBgClass } from './ActionButton';
export type { ActionButtonBgClass };
export interface ExchangeButtonProps {
    id?: string;
    buttonType: BUTTON_TYPE;
    buttonText: ReactNode;
    bgClass: ActionButtonBgClass;
    onClick: () => void;
    disabled: boolean;
    busy: boolean;
    warnOnHover: boolean;
    hoverText?: ReactNode;
    endAdornment?: ReactNode;
    /** Rendered after the button — the caller's own confirm popup (e.g.
      * StakeConfirmPopup), or null if not shown. */
    confirmPopup?: ReactNode;
}
export default function ExchangeButton({ id, buttonType: _buttonType, buttonText, bgClass, onClick, disabled, busy, warnOnHover, hoverText, endAdornment, confirmPopup, }: ExchangeButtonProps): import("react").JSX.Element;
