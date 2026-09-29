// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/usePreloadedImageSrc.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/hooks/usePreloadedImageSrc.ts (on request, "do issue 2" —
// TokenLogo's dependency chain). Byte-identical move — pure React state/
// effect hook using the standard browser Image() API, zero
// ExchangeContext/Next.js coupling.
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holds the last successfully-shown image src until the NEXT one has
 * finished loading in the background, instead of handing a plain
 * `<img src={x}>` a brand-new URL and letting the element itself go
 * blank while the browser fetches it.
 *
 * Returns `nextSrc` unchanged on the very first render (nothing to hold
 * onto yet), then only updates once a later `nextSrc` change has actually
 * finished loading (or failed — see the onerror branch below).
 *
 * `fallbackSrc` (optional): when the background preload finds `nextSrc`
 * is broken, this hook hands the caller `fallbackSrc` directly instead of
 * the known-bad URL. Callers that don't pass one keep the original
 * behavior — the broken URL is handed through unchanged.
 */
export function usePreloadedImageSrc(
  nextSrc: string | undefined,
  fallbackSrc?: string,
): string | undefined {
  const [displayedSrc, setDisplayedSrc] = useState<string | undefined>(nextSrc ?? fallbackSrc);
  // Tracks the most recently REQUESTED src (not necessarily displayed yet)
  // so a rapid-fire sequence of changes only ever ends up displaying the
  // LAST one requested, never a stale mid-sequence value that happened to
  // finish loading late.
  const requestedRef = useRef<string | undefined>(nextSrc);

  useEffect(() => {
    if (nextSrc === requestedRef.current) return;
    requestedRef.current = nextSrc;

    if (!nextSrc) {
      setDisplayedSrc(fallbackSrc);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || requestedRef.current !== nextSrc) return;
      setDisplayedSrc(nextSrc);
    };
    img.onerror = () => {
      if (cancelled || requestedRef.current !== nextSrc) return;
      setDisplayedSrc(fallbackSrc ?? nextSrc);
    };
    img.src = nextSrc;

    return () => {
      cancelled = true;
    };
  }, [nextSrc, fallbackSrc]);

  return displayedSrc;
}
