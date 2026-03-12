/**
 * Manages a single `<canvas>` element:
 *   - Initialises and maintains the 2D context
 *   - Tracks logical (CSS) dimensions as `width` / `height`
 *   - Handles DPR-aware resizing with debounce via ResizeObserver
 *   - Calls an optional `onResize` callback after each resize
 *   - Exposes `applyTransform()` so callers set DPR scale once per frame
 *
 * IMPORTANT: the constructor does NOT fire `onResize` automatically.
 * Callers that pass `onResize` (e.g. ExperimentBase) must call
 * `cm.resize()` themselves once their own fields are fully initialised,
 * to avoid accessing `undefined` references during the super() call.
 */
export class CanvasManager {
  readonly canvas: HTMLCanvasElement;
  readonly ctx:    CanvasRenderingContext2D;

  width  = 0;
  height = 0;

  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly resizeDebounceMs: number;
  private readonly onResizeCallback?: () => void;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    canvas: HTMLCanvasElement,
    resizeDebounceMs = 80,
    onResize?: () => void,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CanvasManager: could not get 2D context');

    this.canvas           = canvas;
    this.ctx              = ctx;
    this.resizeDebounceMs = resizeDebounceMs;
    this.onResizeCallback = onResize;

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(canvas);

    // Size the pixel buffer immediately, but intentionally do NOT call
    // onResizeCallback here.  The caller must invoke `resize()` explicitly
    // after construction, once all of their own fields are assigned.
    this.updatePixelBuffer();
  }

  /** DPR capped at 2 to avoid excessive pixel counts on high-DPI displays. */
  get dpr(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  /** Apply DPR transform at the start of each frame. Draw in CSS pixels. */
  applyTransform(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Sync canvas pixel dimensions and fire onResize. */
  resize(): void {
    this.updatePixelBuffer();
    this.onResizeCallback?.();
  }

  /** Remove all observers (call on component teardown). */
  destroy(): void {
    this.resizeObserver.disconnect();
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /** Update pixel buffer dimensions without firing the callback. */
  private updatePixelBuffer(): void {
    this.width  = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width  = this.width  * this.dpr;
    this.canvas.height = this.height * this.dpr;
  }

  private scheduleResize(): void {
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.resize(), this.resizeDebounceMs);
  }
}