// File: AnonymousAvatar.tsx
// 2026-10-03, on request ("if there is no agent, the avatar should be
// Anonymous.png ... this should be global for all accountSelectDropDowns") —
// the one placeholder every account-style dropdown (Account/Agent/Recipient
// pills, the wallet account header) shows when there is no account avatar to
// show. Before, each decided on its own: a blank dark circle when nothing was
// selected, or QuestionRed.png (the "missing logo" glyph) for a cleared
// selection.
//
// The default is an absolute path, not an import, so this package stays free of
// any app's asset pipeline: the web app serves it from public/, and the
// extension ships the same file at assets/miscellaneous/Anonymous.png (listed in
// its manifest's web_accessible_resources) so the same path resolves there too.
// A host with a different layout can override it per component via
// `anonymousIconSrc`.
//
// Inline styles only (no Tailwind), same reasoning as every other component in
// this package.

'use client';

import React from 'react';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';

// Single source of truth: spcoin-feeds' ANONYMOUS_ACCOUNT_AVATAR_URL.
export const ANONYMOUS_ACCOUNT_ICON_SRC = ANONYMOUS_ACCOUNT_AVATAR_URL;

export interface AnonymousAvatarProps {
  src?: string;
  alt?: string;
}

export default function AnonymousAvatar({
  src = ANONYMOUS_ACCOUNT_ICON_SRC,
  alt = 'No account selected',
}: AnonymousAvatarProps) {
  return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}
