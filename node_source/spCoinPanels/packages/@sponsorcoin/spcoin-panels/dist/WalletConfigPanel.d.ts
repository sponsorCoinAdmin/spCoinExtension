export type OpenTarget = 'local' | 'prod';
export interface WalletConfigPanelProps {
    /** Omit for an inert row of every button doing nothing. */
    onLogoff?: () => void;
    onResetPassword?: () => void;
    /** Which app URL the extension's Open button targets. Default 'prod' —
     *  see this file's own header comment; no effect outside a consumer that
     *  actually reads it (today, only spCoinExtension's openApp.ts does). */
    openTarget?: OpenTarget;
    onOpenTargetChange?: (target: OpenTarget) => void;
}
export default function WalletConfigPanel({ onLogoff, onResetPassword, openTarget, onOpenTargetChange, }: WalletConfigPanelProps): import("react/jsx-runtime").JSX.Element;
