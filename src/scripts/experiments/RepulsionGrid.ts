import { lerp, clamp, hsl }    from '../utils.js';
import { Spring }               from '../utils.js';
import { ExperimentBase }       from '../ExperimentBase.js';
import { addPointerListeners }  from '../pointer.js';

const COLS = 8;
const ROWS = 8;
const HUE_PALETTE = [22, 208, 350, 0, 148, 258] as const;

interface Cell {
  /** Home position (where the cell rests without repulsion) */
  hx: number;
  hy: number;
  x: Spring;
  y: Spring;
  s: Spring; // scale spring
}

/**
 * EXP 02 — Repulsion Grid
 *
 * An 8×8 grid of squares that flee from the pointer.
 * Each cell uses spring physics to return to its home position.
 */
export class RepulsionGrid extends ExperimentBase {
  private cells: Cell[] = [];

  // -999 = no active pointer (avoids false repulsion at origin)
  private targetX = -999;
  private targetY = -999;
  private smoothX = -999;
  private smoothY = -999;

  private drift   = 0;
  private cleanup: (() => void) | null = null;

  constructor() {
    super('exp2');
    this.cleanup = addPointerListeners(
      this.canvas,
      ({ x, y }) => { this.targetX = x * (this.width  || 1); this.targetY = y * (this.height || 1); },
      ()          => { this.targetX = -999; this.targetY = -999; },
    );
  }

  override destroy(): void {
    this.cleanup?.();
    super.destroy();
  }

  // ─── Rebuild cells when canvas is resized ─────────────────────────────────

  protected override onResize(): void {
    const { width: W, height: H } = this;
    const padX = W * 0.1, padY = H * 0.1;
    const gridW = W - padX * 2;
    const gridH = H - padY * 2;

    this.cells = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const hx = padX + (col / (COLS - 1)) * gridW;
        const hy = padY + (row / (ROWS - 1)) * gridH;
        this.cells.push({
          hx, hy,
          x: new Spring(hx, 0.04, 0.88),
          y: new Spring(hy, 0.04, 0.88),
          s: new Spring(1,  0.05, 0.88),
        });
      }
    }
  }

  // ─── Per-frame ────────────────────────────────────────────────────────────

  protected onFrame(dt: number, t: number): void {
    const { ctx, width: W, height: H } = this;

    this.drift  += dt * 0.000014;
    this.smoothX = lerp(this.smoothX, this.targetX, 0.08);
    this.smoothY = lerp(this.smoothY, this.targetY, 0.08);

    const minDim     = Math.min(W, H);
    const repelRadius = minDim * 0.26;
    const repelPush   = minDim * 0.18;
    const cellSize    = minDim / (COLS * 1.9);

    this.cells.forEach((cell, i) => {
      const dist = Math.hypot(this.smoothX - cell.hx, this.smoothY - cell.hy);
      const rep  = clamp(1 - dist / repelRadius, 0, 1);
      const ang  = Math.atan2(cell.hy - this.smoothY, cell.hx - this.smoothX);
      const push = rep * rep * repelPush;

      cell.x.to(cell.hx + Math.cos(ang) * push + Math.sin(this.drift + i * 0.7) * 1.2);
      cell.y.to(cell.hy + Math.sin(ang) * push + Math.cos(this.drift + i * 0.5) * 1.2);
      cell.s.to(1 + rep * 0.5);
      cell.x.tick();
      cell.y.tick();
      cell.s.tick();
    });

    // Background
    ctx.fillStyle = '#0B0907';
    ctx.fillRect(0, 0, W, H);

    // Cells
    this.cells.forEach((cell, i) => {
      const baseHue = HUE_PALETTE[i % HUE_PALETTE.length];
      ctx.fillStyle = hsl(
        (baseHue + this.drift * 26 + i * 4) % 360,
        42 + (i % 3) * 7,
        16 + (i % 4) * 6,
      );
      const sz = cellSize * cell.s.x;
      ctx.fillRect(cell.x.x - sz * 0.5, cell.y.x - sz * 0.5, sz, sz);
    });
  }
}