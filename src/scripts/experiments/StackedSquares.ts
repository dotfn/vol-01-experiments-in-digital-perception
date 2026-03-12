
import { lerp, clamp, hsl }    from '../utils.js';
import { ExperimentBase }       from '../ExperimentBase.js';
import { addPointerListeners }  from '../pointer.js';

/** Size and upward-offset ratios for each of the 5 layers. */
const SIZE_RATIOS   = [1, 0.755, 0.570, 0.430, 0.323] as const;
const OFFSET_RATIOS = [0, 0.026, 0.050, 0.068, 0.082] as const;

/** Base HSL colour for each layer [hue, sat, lit] */
const BASE_COLORS: [number, number, number][] = [
  [208, 20, 12],
  [208, 55, 22],
  [200, 60, 36],
  [192, 50, 55],
  [180, 40, 76],
];

/**
 * EXP 04 — Stacked Squares with Light
 *
 * Five concentric squares lit by a movable point light.
 * The light source follows the pointer; each layer receives
 * a directional gradient to simulate simple shading.
 */
export class StackedSquares extends ExperimentBase {
  // Smoothed light position [0, 1]
  private lx = 0.5;
  private ly = 0.42;
  // Target light position
  private tlx = 0.5;
  private tly = 0.42;

  private pointerOver = false;
  private drift       = 0;
  private cleanup: (() => void) | null = null;

  constructor() {
    super('exp4');
    this.cleanup = addPointerListeners(
      this.canvas,
      ({ x, y }) => { this.tlx = x; this.tly = y; this.pointerOver = true; },
      ()          => { this.tlx = 0.5; this.tly = 0.42; this.pointerOver = false; },
    );
  }

  override destroy(): void {
    this.cleanup?.();
    super.destroy();
  }

  protected onFrame(dt: number): void {
    const { ctx, width: W, height: H } = this;

    this.drift += dt * 0.000013;
    this.lx = lerp(this.lx, this.tlx, 0.05);
    this.ly = lerp(this.ly, this.tly, 0.05);

    // Background
    ctx.fillStyle = '#080705';
    ctx.fillRect(0, 0, W, H);

    const outerSize = Math.min(W, H) * 0.84;
    const centerX   = W * 0.5;
    const centerY   = H * 0.5 * 1.04;
    const lightX    = this.lx * W;
    const lightY    = this.ly * H;

    // Draw layers back-to-front (largest first)
    for (let i = 0; i < 5; i++) {
      const sz     = outerSize * SIZE_RATIOS[i];
      const up     = outerSize * OFFSET_RATIOS[i];
      const rx     = centerX - sz * 0.5;
      const ry     = centerY - sz * 0.5 - up;
      const layerCY = centerY - up;

      const [bh, bs, bl] = BASE_COLORS[i];
      const dist   = Math.hypot(lightX - centerX, lightY - layerCY);
      const litFactor  = clamp(1 - (dist / Math.max(W, H)) * 0.9, 0.2, 1);
      const highlight  = clamp(1 - dist / (Math.min(W, H) * 0.56), 0, 0.48);

      // Base fill tinted by the drifting hue shift + light factor
      ctx.fillStyle = hsl(
        (bh + this.drift * 13) % 360,
        bs,
        clamp(bl * litFactor + highlight * 25, 0, 93),
      );
      ctx.fillRect(rx, ry, sz, sz);

      // Directional shading gradient
      const angle = Math.atan2(lightY - layerCY, lightX - centerX);
      const half  = sz * 0.5;
      const grad  = ctx.createLinearGradient(
        centerX + Math.cos(angle) * half, layerCY + Math.sin(angle) * half,
        centerX - Math.cos(angle) * half, layerCY - Math.sin(angle) * half,
      );
      grad.addColorStop(0, `rgba(255,245,235,${highlight * 0.15})`);
      grad.addColorStop(0.5, 'rgba(0,0,0,0)');
      grad.addColorStop(1,   `rgba(0,0,0,${0.14 * (1 - litFactor)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(rx, ry, sz, sz);
    }

    // ── Pointer glow indicator ──────────────────────────────────────────────
    if (this.pointerOver) {
      ctx.beginPath();
      ctx.arc(lightX, lightY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,248,225,.18)';
      ctx.fill();

      const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, outerSize * 0.48);
      glow.addColorStop(0, 'rgba(255,248,225,.05)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }
  }
}