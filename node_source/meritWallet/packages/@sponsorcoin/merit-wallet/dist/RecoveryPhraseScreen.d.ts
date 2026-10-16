import React from 'react';
export interface RecoveryPhraseScreenProps {
    /** The space-separated words, shown once. */
    recoveryPhrase: string;
    /** The person confirmed they saved it (the phrase is dropped from memory first). */
    onContinue(): void;
    /** Hide the words when the page is hidden or after a time limit (default true: the extension). The web wallet's first run passes false: its phrase cannot be shown again, so it must not vanish before it is saved. */
    autoHide?: boolean;
}
export default function RecoveryPhraseScreen({ recoveryPhrase, onContinue, autoHide }: RecoveryPhraseScreenProps): React.JSX.Element;
