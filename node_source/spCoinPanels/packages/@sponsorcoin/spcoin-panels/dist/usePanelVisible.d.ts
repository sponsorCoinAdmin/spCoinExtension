import { type PanelId } from './panelState';
/**
 * Subscribe to a single panel's visibility. Component re-renders only
 * when THIS panel changes.
 */
export declare function usePanelVisible(id: PanelId): boolean;
