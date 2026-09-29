// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/activeListPanelStore.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/activeListPanelStore.ts (panel-tree
// migration follow-up, "stage 9c" — see docs/npmMigrationDesign.md).
// Unblocked by two things landing earlier the same day: the panel-tree
// runtime itself (stage 9) and FEED_TYPE joining STATUS/TRADE_DIRECTION as
// a @sponsorcoin/spcoin-common export (this file's only real dependency
// beyond already-portable spCoinAccount/TokenContract types). No coupling
// found — content unchanged.
'use client';
import { FEED_TYPE } from '@sponsorcoin/spcoin-common/context';
/**
 * The PANEL_TITLE banner text for a given feed — describes what's
 * IN the list, not the transactional role (e.g. sell vs buy show the same
 * title since they show the same token list; the trading-pair labels already
 * convey which side you're picking for).
 */
export function getPanelTitle(feedType) {
    switch (feedType) {
        case FEED_TYPE.REMOTE_TOKEN_LIST:
            return 'Select a Token';
        case FEED_TYPE.REMOTE_SPONSOR_ACCOUNTS:
            return 'Select Sponsor';
        case FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS:
            return 'Select Recipient';
        case FEED_TYPE.REMOTE_AGENT_ACCOUNTS:
            return 'Select Agent';
        case FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST:
            return 'Browse Accounts';
        case FEED_TYPE.MANAGE_RECIPIENTS:
            return 'Manage Recipients';
        case FEED_TYPE.MANAGE_AGENTS:
            return 'Manage Agents';
        default:
            return 'Select an Asset';
    }
}
class ActiveListPanelStore {
    constructor() {
        this.params = null;
        this.listeners = new Set();
        this.get = () => this.params;
        this.set = (params) => {
            this.params = params;
            for (const fn of Array.from(this.listeners))
                fn();
        };
        this.clear = () => {
            if (this.params === null)
                return;
            this.params = null;
            for (const fn of Array.from(this.listeners))
                fn();
        };
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => {
                this.listeners.delete(listener);
            };
        };
    }
}
export const activeListPanelStore = new ActiveListPanelStore();
