import { useEffect, useRef } from 'react';

/**
 * PERF (new): setInterval that PAUSES while the tab is hidden and catches up once when it becomes visible again.
 * Used for polling (order lists, counters) so background tabs stop hitting the server.
 * `fn` can change freely between renders: the latest one is always used and the timer is not restarted.
 */
export function useVisibleInterval(fn, ms) {
  const saved = useRef(fn); saved.current = fn;
  useEffect(() => {
    let t = null;
    const start = () => { if (t == null) t = setInterval(() => saved.current(), ms); };
    const stop = () => { if (t != null) { clearInterval(t); t = null; } };
    const onVis = () => { if (document.hidden) stop(); else { saved.current(); start(); } };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [ms]);
}
