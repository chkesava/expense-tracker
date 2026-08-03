/**
 * Schedule non-critical work after the browser is idle (or after a short timeout).
 * Returns a cancel function.
 */
export function scheduleIdleWork(
  work: () => void,
  options?: { timeoutMs?: number; fallbackDelayMs?: number }
): () => void {
  const timeoutMs = options?.timeoutMs ?? 2500;
  const fallbackDelayMs = options?.fallbackDelayMs ?? 1200;

  let idleId: number | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    idleId = window.requestIdleCallback(() => work(), { timeout: timeoutMs });
  } else {
    timeoutId = setTimeout(work, fallbackDelayMs);
  }

  return () => {
    if (idleId !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };
}
