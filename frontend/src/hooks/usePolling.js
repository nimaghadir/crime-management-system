import { useEffect, useRef } from "react";

export function usePolling(callback, intervalMs, dependencies = [], options = {}) {
  const { immediate = true } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return undefined;
    }

    let stopped = false;
    const run = () => {
      if (stopped) return;
      callbackRef.current?.();
    };

    if (immediate) {
      run();
    }

    const intervalId = setInterval(run, intervalMs);
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, immediate, ...dependencies]);
}

