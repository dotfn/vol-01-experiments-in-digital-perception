import { lerp, hsl }          from '../utils.js';
import { ExperimentBase }     from '../ExperimentBase.js';
import { addPointerListeners } from '../pointer.js';

/**
 * EXP 01 — Divided Field
 *
 * A vertical divider splits the canvas into two hue fields.
 * The pointer shifts the divider position and colours.
 */
export class DividedField extends ExperimentBase {
  // Smoothed pointer position [0, 1]
  private mx = 0.5;
  private my = 0.5;
  // Target pointer position
  private tx = 0.5;
  private ty = 0.5;

  private drift   = 0;
  private cleanup: (() => void) | null = null;

  constructor() {
    super('exp1');
    this.cleanup = addPointerListeners(
      this.canvas,
      ({ x, y }) => { this.tx = x; this.ty = y; },
      ()          => { this.tx = 0.5; this.ty = 0.5; },
    );
  }

  override destroy(): void {
    this.cleanup?.();
    super.destroy();
  }

  protected onFrame(dt: number): void {
    const { ctx, width: W, height: H } = this;

    this.drift += dt * 0.000025;
    this.mx = lerp(this.mx, this.tx, 0.05);
    this.my = lerp(this.my, this.ty, 0.05);

    const divX = W * (0.36 + this.mx * 0.28);
    const hA   = (22 + this.drift * 36 + this.mx * 18) % 360;
    const hB   = (208 - this.drift * 24 - this.mx * 14 + 360) % 360;

    // Left field
    ctx.fillStyle = hsl(hA, 50, 16);
    ctx.fillRect(0, 0, divX, H);

    // Right field
    ctx.fillStyle = hsl(hB, 55, 22);
    ctx.fillRect(divX, 0, W - divX, H);

    // Divider line
    ctx.strokeStyle = 'rgba(8,7,6,.8)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(divX, 0);
    ctx.lineTo(divX, H);
    ctx.stroke();

    // Horizontal strip
    const stripH = H * 0.13;
    const stripY = (H - stripH) * 0.5;
    ctx.fillStyle = 'hsl(0,0%,50%)';
    ctx.fillRect(W * 0.12,  stripY, divX - W * 0.12,          stripH);
    ctx.fillRect(divX,      stripY, W * 0.76 - divX + W * 0.12, stripH);
  }
}