import { useCallback, useEffect, useRef, useState } from 'react';

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* cai no fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function useClipboard(resetMs = 2500) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (text: string) => {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'error');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), resetMs);
    return ok;
  }, [resetMs]);
  return { state, copy };
}
