import React from 'react';
/**
 * TokenPanel
 * - Single gate: TOKEN_PANEL
 * - Displays info for the currently previewed token contract (a token logo's click handler always sets a preview token before opening this panel,
 *   so preview mode is the real path; buy / sell token are a defensive fallback for stale persisted state with no preview set).
 */
export default function TokenPanel(_props: {
    onClose?: () => void;
}): React.JSX.Element | null;
