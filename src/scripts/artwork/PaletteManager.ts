import { ease, lerpH } from '../utils.js';
import { PALETTES, PALETTE_NAMES } from './constants.js';
import type { Square } from './Square.js';

export interface PaletteManagerCallbacks {
  /** Called when the displayed palette name should update, e.g. "Palette III". */
  onPaletteChange?: (name: string) => void;
}

/**
 * Manages palette cycling and interpolation across all layers.
 *
 * Keeps track of the current palette (from) and next palette (to),
 * animating a smooth HSL transition between them.  After the transition
 * completes it waits a configurable dwell period before picking a new
 * random palette and starting again.
 */
export class PaletteManager {
  // Index of the palette we're blending FROM
  private fromIndex  = 0;
  // Index of the palette we're blending TO
  private toIndex    = 0;
  // Blend progress 0 → 1
  private progress   = 1;
  // Milliseconds spent dwelling on the current palette
  private dwellMs    = 0;

  private readonly callbacks: PaletteManagerCallbacks;

  constructor(callbacks: PaletteManagerCallbacks = {}) {
    this.callbacks = callbacks;
    // Kick off the first random selection
    this.advance();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Advance one animation frame.
   *
   * @param dt   - elapsed ms since last frame
   * @param fast - true during contemplative mode (faster cycles)
   * @param layers - all Square instances to colour
   */
  tick(dt: number, fast: boolean, layers: Square[]): void {
    const dwellDuration     = fast ?  3_200 :  9_000;
    const transitionDuration = fast ?  5_200 : 12_000;

    if (this.progress < 1) {
      // Still blending
      this.progress = Math.min(1, this.progress + dt / transitionDuration);
      const t = ease(this.progress);
      layers.forEach((sq, i) => {
        const c = lerpH(PALETTES[this.fromIndex][i], PALETTES[this.toIndex][i], t);
        sq.targetHSL(c[0], c[1], c[2]);
      });
    } else {
      // Dwelling
      this.dwellMs += dt;
      if (this.dwellMs >= dwellDuration) this.advance();
    }
  }

  /**
   * Immediately jump to the next random palette (starts blending).
   * Public so external events (e.g. contemplative mode pulse) can force it.
   */
  advance(): void {
    this.fromIndex = this.toIndex;
    // Pick any palette except the current one
    const pool = PALETTES
      .map((_, i) => i)
      .filter(i => i !== this.fromIndex);
    this.toIndex  = pool[Math.floor(Math.random() * pool.length)];
    this.progress = 0;
    this.dwellMs  = 0;

    this.callbacks.onPaletteChange?.(
      `Palette ${PALETTE_NAMES[this.toIndex]}`
    );
  }
}