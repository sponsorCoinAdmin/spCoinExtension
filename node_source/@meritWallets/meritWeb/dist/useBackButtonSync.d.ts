export interface WalletNavigationState {
    canGoBack: boolean;
    /** how many Back presses lead home (0 at home) */
    depth: number;
    goBack: () => void;
}
export declare function useBackButtonSync(): (state: WalletNavigationState) => void;
