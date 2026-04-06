"use client";

import { useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Hook that loads the reCAPTCHA v3 script and provides a function
 * to execute reCAPTCHA for a given action.
 *
 * Returns `executeRecaptcha` which resolves to a token string,
 * or undefined if reCAPTCHA is not enabled/configured.
 */
export function useRecaptcha(siteKey: string | undefined, enabled: boolean) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !siteKey) return;

    // Don't load twice
    if (document.querySelector('script[src*="recaptcha/api.js"]')) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [siteKey, enabled]);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | undefined> => {
      if (!enabled || !siteKey) return undefined;
      if (!loaded || !window.grecaptcha) return undefined;

      return new Promise((resolve) => {
        window.grecaptcha!.ready(async () => {
          try {
            const token = await window.grecaptcha!.execute(siteKey, { action });
            resolve(token);
          } catch {
            resolve(undefined);
          }
        });
      });
    },
    [siteKey, enabled, loaded]
  );

  return { executeRecaptcha };
}
