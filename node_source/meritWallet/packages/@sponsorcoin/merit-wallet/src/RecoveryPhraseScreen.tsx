// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/RecoveryPhraseScreen.tsx
//
// 2026-10-13: the "Your Secret Recovery Phrase" screen, moved out of WalletOnboardingPanel so the extension's first-run flow and the web popup's first-run flow (password page -> this screen -> the wallet) show
// the same one: the words in a grid, a copy icon (words separated by commas), an "I have saved it" checkbox and Continue. The phrase is shown once; it is hidden when the page is hidden or after a time limit
// (security/secretClearing.ts), and Continue stays available then (the wallet already exists; the phrase can be shown again in Security with the password).
'use client';

import React, { useState } from 'react';
import { recoveryPhraseStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import { useCopyFeedback } from './platform/useCopyFeedback';
import { NEW_PHRASE_SHOWN_MAX_MS, useSecretClearing } from './security/secretClearing';


export interface RecoveryPhraseScreenProps {
  /** The space-separated words, shown once. */
  recoveryPhrase: string;
  /** The person confirmed they saved it (the phrase is dropped from memory first). */
  onContinue(): void;
  /** Hide the words when the page is hidden or after a time limit (default true: the extension). The web wallet's first run passes false: its phrase cannot be shown again, so it must not vanish before it is saved. */
  autoHide?: boolean;
}

export default function RecoveryPhraseScreen({ recoveryPhrase, onContinue, autoHide = true }: RecoveryPhraseScreenProps) {
  const [phrase, setPhrase] = useState(recoveryPhrase);
  const [phraseHidden, setPhraseHidden] = useState(false);
  const [saved, setSaved] = useState(false);
  const { copied, copy } = useCopyFeedback();
  const [infoOpen, setInfoOpen] = useState(false);
  useSecretClearing(!!phrase, () => { if (autoHide) { setPhrase(''); setPhraseHidden(true); } }, NEW_PHRASE_SHOWN_MAX_MS);
  const infoText = autoHide
    ? (phraseHidden ? 'The phrase was hidden for your safety (the page was hidden or the screen was open for a while). Your wallet is created: show the phrase again in Security, with your password.' : 'The phrase is hidden automatically if the page is hidden or this screen stays open for a while. It can be shown again in Security, with your password.')
    : 'The phrase is shown only now and is not stored, so it cannot be shown again later. Anyone who has it can take everything: keep it somewhere safe.';
  const words = phrase ? phrase.split(' ') : [];
  return (
    <div id="WALLET_ONBOARDING_PHRASE" style={recoveryPhraseStyle.box}>
      <div style={recoveryPhraseStyle.titleRow}>
        <p style={recoveryPhraseStyle.title}>Your Secret Recovery Phrase</p>
        {/* 2026-10-13 (owner request): the note about when the phrase is shown or hidden is an info icon at the top right of the title, not a block of text or a page of its own. */}
        <button type="button" id="WALLET_ONBOARDING_PHRASE_INFO" aria-label="About the Secret Recovery Phrase" title={infoText} onClick={() => setInfoOpen((open) => !open)} style={recoveryPhraseStyle.iconButton(infoOpen ? walletPartClass.phraseIcon.open : walletPartClass.phraseIcon.idle)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </button>
      </div>
      {infoOpen && <p id="WALLET_ONBOARDING_PHRASE_INFO_TEXT" style={recoveryPhraseStyle.muted}>{infoText}</p>}
      <p style={recoveryPhraseStyle.muted}>Write these words down in order and keep them somewhere safe. They are the only way to get your accounts back, and anyone who has them can take everything. This is the only time they are shown automatically.</p>
      {!phraseHidden && <ol style={recoveryPhraseStyle.words}>
        {words.map((w, i) => <li key={i} style={recoveryPhraseStyle.word}>{w}</li>)}
      </ol>}
      <div style={recoveryPhraseStyle.saveRow}>
        <label style={recoveryPhraseStyle.saveLabel}>
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved my Secret Recovery Phrase
        </label>
        <button
          type="button"
          title={copied ? 'Copied' : 'Copy the phrase (words separated by commas)'}
          aria-label="Copy Secret Recovery Phrase"
          onClick={() => {
            copy(words.join(','));
          }}
          style={recoveryPhraseStyle.iconButton(copied ? walletPartClass.phraseIcon.copied : walletPartClass.phraseIcon.idle)}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
      </div>
      <button type="button" disabled={!saved && !phraseHidden} style={recoveryPhraseStyle.primaryButton(saved || phraseHidden)} onClick={() => { setPhrase(''); setPhraseHidden(false); onContinue(); }}>Continue</button>
    </div>
  );
}
