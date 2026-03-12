import { hsl }           from '../utils.js';
import { ExperimentBase } from '../ExperimentBase.js';

const HUE_POOL = [22, 208, 350, 0, 148, 258, 38, 188] as const;

type Phase = 'grow' | 'hold' | 'fade';

interface Rect {
  x: number; y: number;
  w: number; h: number;
  hue: number; sat: number; lit: number;
}

/**
 * EXP 03 — Mondrian Split (fully automatic)
 *
 * Recursively divides the canvas with coloured rectangles,
 * holds for a moment, then fades out and resets.
 *
 * State machine: grow → hold → fade → (reset → grow)
 */
export class MondrianSplit extends ExperimentBase {
  private rects:     Rect[]  = [];
  private phase:     Phase   = 'grow';
  private alpha              = 1;
  private elapsed            = 0;   // ms accumulated in current cycle
  private nextSplitAt        = 0;   // elapsed ms when next split fires

  constructor() {
    super('exp3');
    this.reset();
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** Reset the full cycle. */
  private reset(): void {
    this.rects       = [{ x: 0.02, y: 0.02, w: 0.96, h: 0.96, hue: HUE_POOL[0], sat: 18, lit: 12 }];
    this.phase       = 'grow';
    this.alpha       = 1;
    this.elapsed     = 0;
    this.nextSplitAt = 2_200;
  }

  // ─── Splitting logic ──────────────────────────────────────────────────────

  /**
   * Split one randomly chosen rectangle into two.
   * Prefers horizontal splits for wide rects and vertical for tall ones.
   */
  private split(): void {
    const { width: W, height: H } = this;

    // Only split rects that are large enough to read after splitting
    const candidates = this.rects.filter(r => r.w * W > 44 && r.h * H > 44);
    if (!candidates.length) { this.phase = 'hold'; return; }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const idx    = this.rects.indexOf(target);

    const splitHoriz = Math.random() < (target.w > target.h ? 0.6 : 0.4);
    const ratio      = 0.24 + Math.random() * 0.52;

    const newHue = HUE_POOL[Math.floor(Math.random() * HUE_POOL.length)];
    const newLit = 8  + Math.random() * 52;
    const newSat = 14 + Math.random() * 58;

    const [a, b] = splitHoriz
      ? [
          { ...target, w: target.w * ratio },
          { ...target, x: target.x + target.w * ratio, w: target.w * (1 - ratio), hue: newHue, sat: newSat, lit: newLit },
        ]
      : [
          { ...target, h: target.h * ratio },
          { ...target, y: target.y + target.h * ratio, h: target.h * (1 - ratio), hue: newHue, sat: newSat, lit: newLit },
        ];

    this.rects.splice(idx, 1, a, b);

    if (this.rects.length > 18) this.phase = 'hold';
  }

  // ─── Frame ────────────────────────────────────────────────────────────────

  protected onFrame(dt: number): void {
    const { ctx, width: W, height: H } = this;

    this.elapsed += dt;

    // ── State machine ──
    if (this.phase === 'grow') {
      if (this.elapsed >= this.nextSplitAt) {
        this.split();
        this.nextSplitAt = this.elapsed + 900 + Math.random() * 2_000;
      }
    } else if (this.phase === 'hold') {
      if (this.elapsed >= this.nextSplitAt + 3_500) {
        this.phase = 'fade';
      }
    } else {
      // fade
      this.alpha = Math.max(0, this.alpha - 0.0016 * (dt / 16));
      if (this.alpha <= 0) this.reset();
    }

    // ── Draw ──
    ctx.fillStyle = '#0B0907';
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = this.alpha;
    this.rects.forEach(r => {
      ctx.fillStyle = hsl(r.hue, r.sat, r.lit);
      ctx.fillRect(r.x * W + 1, r.y * H + 1, r.w * W - 2, r.h * H - 2);
    });
    ctx.globalAlpha = 1;
  }
}