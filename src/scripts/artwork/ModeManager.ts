/**
 * Tracks whether the artwork is in *Ambient* or *Contemplative* mode.
 *
 * Rules
 * ─────
 * • The artwork enters Contemplative mode after the pointer has been
 *   stationary inside the canvas for `idleMs` (default 3.5 s).
 * • Any pointer movement exits Contemplative mode immediately.
 * • While in Contemplative mode a cycle timer fires every `cycleMs`
 *   (default 10 s), notifying the caller via `onCyclePulse`.
 */
export interface ModeManagerCallbacks {
  onEnterContemplative?: () => void;
  onExitContemplative?:  () => void;
  /** Fired periodically while in contemplative mode. */
  onCyclePulse?:         () => void;
  onModeChange?:         (label: string) => void;
}

export class ModeManager {
  isContemplative = false;

  private lastMoveAt  = 0;       // performance.now() of last pointer move
  private cycleAccMs  = 0;       // accumulated ms inside contemplative mode
  private pointerInside = false;

  private readonly idleMs:   number;
  private readonly cycleMs:  number;
  private readonly callbacks: ModeManagerCallbacks;

  private readonly labelAmbient:       string;
  private readonly labelContemplative: string;

  constructor(
    callbacks: ModeManagerCallbacks = {},
    labels = { ambient: 'Ambient', contemplative: 'Contemplative' },
    idleMs  = 3_500,
    cycleMs = 10_000,
  ) {
    this.callbacks = callbacks;
    this.labelAmbient       = labels.ambient;
    this.labelContemplative = labels.contemplative;
    this.idleMs  = idleMs;
    this.cycleMs = cycleMs;
  }

  // ─── Called by InteractionManager ─────────────────────────────────────────

  notifyPointerMove(): void {
    this.lastMoveAt   = performance.now();
    this.pointerInside = true;
    if (this.isContemplative) this.exitContemplative();
  }

  notifyPointerLeave(): void {
    this.pointerInside = false;
  }

  // ─── Per-frame tick ───────────────────────────────────────────────────────

  tick(dt: number): void {
    if (this.pointerInside && !this.isContemplative) {
      if (performance.now() - this.lastMoveAt > this.idleMs) {
        this.enterContemplative();
      }
    }

    if (this.isContemplative) {
      this.cycleAccMs += dt;
      if (this.cycleAccMs >= this.cycleMs) {
        this.cycleAccMs = 0;
        this.callbacks.onCyclePulse?.();
      }
    } else {
      this.cycleAccMs = 0;
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private enterContemplative(): void {
    this.isContemplative = true;
    this.callbacks.onEnterContemplative?.();
    this.callbacks.onModeChange?.(this.labelContemplative);
  }

  private exitContemplative(): void {
    this.isContemplative = false;
    this.callbacks.onExitContemplative?.();
    this.callbacks.onModeChange?.(this.labelAmbient);
  }
}