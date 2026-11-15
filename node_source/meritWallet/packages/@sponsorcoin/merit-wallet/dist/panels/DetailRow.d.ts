import React from 'react';
export interface DetailRowProps {
    label: string;
    value: React.ReactNode;
    zebra: boolean;
    /** Owner report 2026-10-26: the Address row of a detail card (TokenDetailPanel, etc.) had no way to copy it, unlike every other place
     *  an address is shown. Set on a row whose `value` is the plain address string — renders a copy button beside it, same affordance
     *  every other address display in the panel tree already has (AssetSelectDropDown's showCopy, TokenSlotPanels' CopyBtn). */
    copyable?: boolean;
}
export default function DetailRow({ label, value, zebra, copyable }: DetailRowProps): React.JSX.Element;
