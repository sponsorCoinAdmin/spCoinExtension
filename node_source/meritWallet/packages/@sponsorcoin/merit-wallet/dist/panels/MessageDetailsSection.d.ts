import type { ReactNode } from 'react';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
export interface MessageDetailsSectionProps {
    errorMessage: ErrorMessage | undefined;
    /** Renders one account row (icon/symbol/name/address) — the caller
     *  supplies the real, ExchangeContext-bound row component. */
    renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
    /** Renders one token row (logo/symbol/name) — the caller supplies the
     *  real, ExchangeContext-bound row component. */
    renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
}
export default function MessageDetailsSection({ errorMessage, renderAccountRow, renderTokenRow }: MessageDetailsSectionProps): import("react").JSX.Element | null;
