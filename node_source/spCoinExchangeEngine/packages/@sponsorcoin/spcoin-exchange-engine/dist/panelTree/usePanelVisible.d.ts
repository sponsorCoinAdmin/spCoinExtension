import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
/**
 * Subscribe to a single panel's visibility.
 * Component re-renders only when THIS panel changes.
 */
export declare function usePanelVisible(id: SP_COIN_DISPLAY): boolean;
