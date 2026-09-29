import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
export interface TokenLogoProps {
    tokenContract?: TokenContract;
    logoURL?: string;
    symbol?: string;
    name?: string;
    address?: string;
    chainId?: number;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
    /**
     * Which panel a default (no `onClick` override) click opens. Defaults to
     * TOKEN_PANEL — the generic "preview whichever token was last clicked"
     * panel. Callers with a fixed, unambiguous token source (the Swap/
     * Sponsor tabs' own buy/sell pills) should pass their own panel id
     * instead, so the click opens the detail view for THAT specific slot
     * rather than always falling back to the generic one.
     */
    targetPanel?: SP_COIN_DISPLAY;
}
export default function TokenLogo({ tokenContract, logoURL, symbol, name, address, chainId, className, title, onClick, targetPanel, }: TokenLogoProps): React.JSX.Element;
