import { lerp, hsl } from '../utils.js';
import { BG_COLOR } from './constants.js';
import type { CanvasManager } from '../CanvasManager.js';
import type { Square } from './Square.js';

/**
 * Responsible for compositing all visual layers onto the canvas each frame.
 *
 * Keeps no mutable state beyond the bloom fade value, which is purely a
 * rendering concern.  All artwork state (palette, position, mode) lives in
 * the other managers and is passed in per-frame.
 */
export class Renderer {
  private bloomAlpha = 0;

  constructor(private readonly canvas: CanvasManager) {}

  // ─── Per-frame draw ───────────────────────────────────────────────────────

  /**
   * Composite one full frame.
   *
   * @param squares        - all layers, already updated for this frame
   * @param contemplative  - whether contemplative bloom should be active
   * @param pointerActive  - whether the pointer cursor should be drawn
   * @param pointerX / Y   - pointer position in canvas-local pixels
   * @param time           - elapsed ms from rAF (used for cursor animation)
   */
  draw(
    squares:       Square[],
    contemplative: boolean,
    pointerActive: boolean,
    pointerX:      number,
    pointerY:      number,
    time:          number,
  ): void {
    const { ctx, width, height } = this.canvas;
    this.canvas.applyTransform();

    this.drawBackground(ctx, width, height);
    this.drawVignette(ctx, width, height);

    // Animate bloom toward its target opacity
    this.bloomAlpha = lerp(this.bloomAlpha, contemplative ? 0.6 : 0, 0.024);
    if (this.bloomAlpha > 0.004) {
      this.drawBloom(ctx, squares, width, height);
    }

    squares.forEach(sq => sq.draw(ctx, width, height));

    if (pointerActive) {
      this.drawCursor(ctx, pointerX, pointerY, time);
    }
  }

  // ─── Private draw helpers ─────────────────────────────────────────────────

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
  ): void {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
  ): void {
    const gradient = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.1,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.82,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,.52)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Soft radial glow centred on the innermost layer,
   * tinted to match its current hue.
   */
  private drawBloom(
    ctx:     CanvasRenderingContext2D,
    squares: Square[],
    w:       number,
    h:       number,
  ): void {
    const innermost = squares[squares.length - 1];
    const b  = innermost.bounds(w, h);
    const bh = (innermost['hSp'].x % 360 + 360) % 360; // access private spring for hue

    const gradient = ctx.createRadialGradient(
      b.cx, b.cy, innermost.currentSize(w, h) * 0.04,
      b.cx, b.cy, innermost.currentSize(w, h) * 1.9,
    );
    gradient.addColorStop(0, hsl(bh, 50, 62, this.bloomAlpha * 0.17));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Minimal animated crosshair cursor — two concentric circles.
   * The outer ring pulses slightly with a low-frequency sine.
   */
  private drawCursor(
    ctx:   CanvasRenderingContext2D,
    x:     number,
    y:     number,
    time:  number,
  ): void {
    const pulse = 1 + Math.sin(time * 0.0026) * 0.13;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 5 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236,234,227,.24)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();

    // Centre dot
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(236,234,227,.38)';
    ctx.fill();
  }
}