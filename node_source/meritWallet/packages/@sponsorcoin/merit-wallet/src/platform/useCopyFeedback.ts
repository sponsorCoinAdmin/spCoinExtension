// File: src/platform/useCopyFeedback.ts
//
// 2026-10-16 (cleanup): the ONE "copy to the clipboard, then show Copied for a moment" behaviour. It had been written out by hand in six places (the recovery phrase, a revealed secret, the agent and token address buttons, the account form's fields, two copy
// buttons), each with its own timer, none handling a refused copy (an unhandled rejection) and none clearing the timer when the screen closed. It copies through the platform (platform.ts), remembers WHICH thing was copied (a key, for a form with several copy
// buttons), forgets it after `ms`, ignores a refusal, and clears its timer on unmount.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlatform } from './platform';

export function useCopyFeedback(ms = 1500) {
  const platform = usePlatform();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    (text: string, key = 'copied') => {
      platform
        .copyText(text)
        .then(() => {
          setCopiedKey(key);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopiedKey(null), ms);
        })
        .catch(() => undefined);
    },
    [platform, ms],
  );
  return { copiedKey, copied: copiedKey !== null, copy };
}
