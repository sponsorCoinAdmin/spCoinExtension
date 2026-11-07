import { type DiscoveryWindow } from './injectedWallet';
export declare const METAMASK_RDNS = "io.metamask";
export interface UseMetaMask {
    /** true while MetaMask lists at least one account for this page. */
    metaMaskConnected: boolean;
    /** Ask MetaMask again now (after this page connects or disconnects it). */
    refreshMetaMask: () => void;
}
/** The page's window, said by the host (the component never reaches for the device itself): discovery plus the events the page hears. */
export type MetaMaskWindow = DiscoveryWindow;
export declare function useMetaMask(win?: MetaMaskWindow): UseMetaMask;
