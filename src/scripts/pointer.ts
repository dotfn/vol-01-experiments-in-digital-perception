/**
 * Normalised pointer position { x, y } in the range [0, 1]
 * relative to the target element's bounding rect.
 */
export interface NormPointer { x: number; y: number }

/**
 * Touch intent state machine.
 *
 *   pending     → waiting for enough movement to classify the gesture
 *   interacting → user is deliberately manipulating the canvas
 *   scrolling   → user is scrolling the page; canvas ignores the touch
 *
 * Classification happens on the first touchmove that exceeds
 * INTENT_THRESHOLD pixels.  Until then no action is taken, which lets
 * the browser decide whether to scroll without fighting it.
 *
 * Rules:
 *   |dy| > |dx| AND |dy| > threshold  →  scrolling   (pass-through)
 *   |dx| >= |dy| OR hold (no movement) →  interacting (preventDefault)
 */
type TouchIntent = 'pending' | 'interacting' | 'scrolling';

/** Minimum movement (px) before we classify the gesture. */
const INTENT_THRESHOLD = 6;

export function addPointerListeners(
  el:      HTMLElement,
  onMove:  (p: NormPointer) => void,
  onLeave: () => void,
): () => void {
  // ─── Helpers ──────────────────────────────────────────────────────────────

  const norm = (clientX: number, clientY: number): NormPointer => {
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  };

  // ─── Touch state ──────────────────────────────────────────────────────────

  let intent: TouchIntent = 'pending';
  let originX = 0;
  let originY = 0;

  const resetTouch = () => { intent = 'pending'; originX = 0; originY = 0; };

  // ─── Touch handlers ───────────────────────────────────────────────────────

  const onTouchStart = (e: TouchEvent): void => {
    // Record origin for intent detection; never preventDefault here so the
    // browser can still begin a scroll if that's what the user wants.
    resetTouch();
    const t = e.touches[0];
    originX = t.clientX;
    originY = t.clientY;
  };

  const onTouchMove = (e: TouchEvent): void => {
    const t  = e.touches[0];
    const dx = t.clientX - originX;
    const dy = t.clientY - originY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (intent === 'pending') {
      // Not enough movement yet to classify — stay silent
      if (adx < INTENT_THRESHOLD && ady < INTENT_THRESHOLD) return;

      // Classify: vertical-dominant → scroll, everything else → interact
      intent = ady > adx ? 'scrolling' : 'interacting';
    }

    if (intent === 'scrolling') return;   // let the browser scroll normally

    // intent === 'interacting'
    e.preventDefault();                   // block scroll while interacting
    onMove(norm(t.clientX, t.clientY));
  };

  const onTouchEnd = (e: TouchEvent): void => {
    // Only cancel the event if we were actually interacting
    if (intent === 'interacting') e.preventDefault();
    resetTouch();
    onLeave();
  };

  // ─── Mouse handlers (unchanged) ───────────────────────────────────────────

  const onMouseMove  = (e: MouseEvent) => onMove(norm(e.clientX, e.clientY));
  const onMouseLeave = ()              => onLeave();

  // ─── Attach ───────────────────────────────────────────────────────────────

  el.addEventListener('mousemove',   onMouseMove);
  el.addEventListener('mouseleave',  onMouseLeave);
  // touchstart must be passive so we don't delay scroll start.
  // touchmove is non-passive so we can preventDefault when interacting.
  el.addEventListener('touchstart',  onTouchStart, { passive: true  });
  el.addEventListener('touchmove',   onTouchMove,  { passive: false });
  el.addEventListener('touchend',    onTouchEnd,   { passive: false });
  el.addEventListener('touchcancel', onTouchEnd,   { passive: false });

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  return () => {
    el.removeEventListener('mousemove',   onMouseMove);
    el.removeEventListener('mouseleave',  onMouseLeave);
    el.removeEventListener('touchstart',  onTouchStart);
    el.removeEventListener('touchmove',   onTouchMove);
    el.removeEventListener('touchend',    onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
  };
}