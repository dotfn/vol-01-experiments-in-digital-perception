import { CanvasManager } from './CanvasManager.js';

/**
 * Base class for all canvas experiments.
 *
 * Delegates canvas setup, DPR handling, and resize to the shared
 * `CanvasManager`.  Adds an IntersectionObserver so the rAF loop
 * pauses automatically when the canvas scrolls out of view.
 *
 * ## Initialization order
 *
 * `CanvasManager` intentionally does NOT fire `onResize` during its own
 * constructor, because at that point the subclass's `this` fields haven't
 * been assigned yet (we're still inside `super()`).  Instead, we call
 * `this.cm.resize()` explicitly here, after `this.cm` is fully assigned,
 * so subclass overrides of `onResize()` can safely access `this.width` etc.
 *
 * Subclasses implement:
 *   • `onResize()`     — rebuild size-dependent data (optional)
 *   • `onFrame(dt, t)` — draw one frame; DPR transform already applied
 */
export abstract class ExperimentBase {
  protected readonly cm: CanvasManager;

  // Convenience aliases so subclasses can write `this.width` etc.
  protected get canvas(): HTMLCanvasElement        { return this.cm.canvas; }
  protected get ctx():    CanvasRenderingContext2D  { return this.cm.ctx;    }
  protected get width():  number                   { return this.cm.width;  }
  protected get height(): number                   { return this.cm.height; }

  private visible = false;
  private rafId:   number | null = null;
  private lastTs   = 0;
  private readonly visibilityObserver: IntersectionObserver;

  constructor(canvasId: string, visibilityThreshold = 0.1) {
    const el = document.getElementById(canvasId);
    if (!(el instanceof HTMLCanvasElement))
      throw new Error(`ExperimentBase: #${canvasId} is not a <canvas>`);

    // Pass onResize as a callback — CanvasManager will call it on every
    // subsequent resize (from its ResizeObserver), but NOT during construction.
    this.cm = new CanvasManager(el, 80, () => this.onResize());

    // Now that `this.cm` is assigned, it's safe to fire the first resize.
    // This triggers `onResize()` in the subclass with valid `this.width/height`.
    this.cm.resize();

    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => { this.visible = entry.isIntersecting; },
      { threshold: visibilityThreshold },
    );
    this.visibilityObserver.observe(el);

    this.rafId = requestAnimationFrame(this.loop);
  }

  // ─── Subclass API ─────────────────────────────────────────────────────────

  /** Override to rebuild grids, springs, or size-dependent structures. */
  protected onResize(): void {}

  /**
   * Draw one frame. Called only while the canvas is visible.
   * The DPR canvas transform is already applied — draw in CSS pixels.
   */
  protected abstract onFrame(dt: number, t: number): void;

  // ─── Public lifecycle ─────────────────────────────────────────────────────

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.visibilityObserver.disconnect();
    this.cm.destroy();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private readonly loop = (ts: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    if (!this.visible) return;

    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    this.cm.applyTransform();
    this.onFrame(dt, ts);
  };
}