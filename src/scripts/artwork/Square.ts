import { Spring, clamp, hsl } from '../utils.js';
import type { HSLTuple } from './constants.js';
import { PALETTES, LAYER_SIZE_RATIOS, LAYER_OFFSET_RATIOS } from './constants.js';

export interface SquareBounds {
  x: number; y: number;
  w: number; h: number;
  cx: number; cy: number;
}

/**
 * One concentric layer of the artwork.
 *
 * Owns its own spring-based position, scale, and colour, plus small
 * randomised breathing oscillations so the layers feel alive.
 */
export class Square {
  readonly index: number;

  // Springs
  private readonly xSp:   Spring;
  private readonly ySp:   Spring;
  private readonly scSp:  Spring;
  private readonly hSp:   Spring;
  private readonly sSp:   Spring;
  private readonly lSp:   Spring;
  readonly hovSp: Spring;

  // Transient colour ripple added on interaction events
  rippleH = 0;
  rippleL = 0;

  // Breathing oscillation parameters (randomised per instance)
  private readonly breathPhase: number;
  private readonly breathRate:  number;
  private readonly depthFactor: number;

  constructor(index: number) {
    this.index = index;
    this.depthFactor = index / 4;                                    // 0 (outer) → 1 (inner)

    const [h, s, l] = PALETTES[0][index];
    const stiffness = 0.030 + this.depthFactor * 0.028;
    const damping   = 0.900 - this.depthFactor * 0.040;

    this.xSp   = new Spring(0, stiffness, damping);
    this.ySp   = new Spring(0, stiffness, damping);
    this.scSp  = new Spring(1, 0.018, 0.930);
    this.hSp   = new Spring(h, 0.010, 0.876);
    this.sSp   = new Spring(s, 0.010, 0.876);
    this.lSp   = new Spring(l, 0.010, 0.876);
    this.hovSp = new Spring(0, 0.060, 0.880);

    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathRate  = 0.00027 + index * 0.000044 + Math.random() * 0.000052;
  }

  // ─── Sizing helpers ────────────────────────────────────────────────────────

  /** Diameter of the outermost (reference) square, capped for large viewports. */
  private outerSize(canvasW: number, canvasH: number): number {
    return Math.min(Math.min(canvasW, canvasH) * 0.82, 720);
  }

  /** This layer's base size. */
  currentSize(canvasW: number, canvasH: number): number {
    return this.outerSize(canvasW, canvasH) * LAYER_SIZE_RATIOS[this.index];
  }

  /** How far this layer floats upward from centre. */
  private upwardOffset(canvasW: number, canvasH: number): number {
    return this.outerSize(canvasW, canvasH) * LAYER_OFFSET_RATIOS[this.index];
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  /**
   * Advance physics by one frame.
   *
   * @param t       - elapsed time (ms) from `requestAnimationFrame`
   * @param mouseX  - pointer X in canvas-local pixels
   * @param mouseY  - pointer Y in canvas-local pixels
   * @param pointerActive - whether the pointer is currently inside the canvas
   * @param canvasW / canvasH - current canvas logical dimensions
   */
  update(
    t: number,
    mouseX: number, mouseY: number,
    pointerActive: boolean,
    canvasW: number, canvasH: number,
  ): void {
    // Breathing oscillation
    const breathX = Math.sin(t * this.breathRate + this.breathPhase)
                    * (1 + this.depthFactor * 0.9);
    const breathY = Math.cos(t * this.breathRate * 0.72 + this.breathPhase + 1.1)
                    * (0.5 + this.depthFactor * 0.5);

    // Parallax offset from pointer position (inner layers follow more)
    let parallaxX = 0, parallaxY = 0;
    if (pointerActive) {
      const strength = 5 + this.depthFactor * 22;
      parallaxX = ((mouseX - canvasW * 0.5) / canvasW) * strength;
      parallaxY = ((mouseY - canvasH * 0.5) / canvasH) * strength;
    }

    this.xSp.to(parallaxX + breathX);
    this.ySp.to(-this.upwardOffset(canvasW, canvasH) + parallaxY + breathY);
    this.scSp.to(
      1 + Math.sin(t * this.breathRate * 0.52 + this.breathPhase + 1.8) * 0.006
    );

    [this.xSp, this.ySp, this.scSp, this.hSp, this.sSp, this.lSp, this.hovSp]
      .forEach(s => s.tick());

    // Decay ripple
    this.rippleH *= 0.973;
    this.rippleL *= 0.973;
  }

  // ─── Colour control ───────────────────────────────────────────────────────

  /**
   * Drive this layer toward a target HSL colour.
   * Wraps hue through the short arc to avoid spinning past 180°.
   */
  targetHSL(h: number, s: number, l: number): void {
    const delta = h - this.hSp.x;
    if (delta >  180) this.hSp.snap(this.hSp.x + 360);
    if (delta < -180) this.hSp.snap(this.hSp.x - 360);
    this.hSp.to(h);
    this.sSp.to(s);
    this.lSp.to(l);
  }

  // ─── Hit testing ──────────────────────────────────────────────────────────

  bounds(canvasW: number, canvasH: number): SquareBounds {
    const sz = this.currentSize(canvasW, canvasH) * this.scSp.x;
    const cx = canvasW  * 0.5 + this.xSp.x;
    const cy = canvasH  * 0.5 + this.ySp.x;
    return { x: cx - sz * 0.5, y: cy - sz * 0.5, w: sz, h: sz, cx, cy };
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  /** Render this layer onto `ctx`. Must be called after `update`. */
  draw(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    const sz      = this.currentSize(canvasW, canvasH) * this.scSp.x;
    const { cx, cy } = this.bounds(canvasW, canvasH);

    this.applyShadow(ctx);

    const h = ((this.hSp.x + this.rippleH) % 360 + 360) % 360;
    const s = clamp(this.sSp.x, 0, 100);
    const l = clamp(this.lSp.x + this.rippleL, 0, 100);

    ctx.fillStyle = hsl(h, s, l);
    ctx.fillRect(cx - sz * 0.5, cy - sz * 0.5, sz, sz);

    // Reset shadow so it doesn't bleed onto subsequent draws
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Hover outline
    if (this.hovSp.x > 0.005) {
      ctx.strokeStyle = `rgba(236,234,227,${this.hovSp.x * 0.18})`;
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(cx - sz * 0.5 + 0.4, cy - sz * 0.5 + 0.4, sz - 0.8, sz - 0.8);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Only the three outer layers receive a drop shadow. */
  private applyShadow(ctx: CanvasRenderingContext2D): void {
    const shadows: Array<{ c: string; b: number; o: number } | null> = [
      { c: 'rgba(0,0,0,.2)',  b: 20, o: 3 },
      { c: 'rgba(0,0,0,.12)', b: 12, o: 2 },
      { c: 'rgba(0,0,0,.06)', b: 6,  o: 1 },
      null, null,
    ];
    const sh = shadows[this.index];
    if (sh) {
      ctx.shadowColor   = sh.c;
      ctx.shadowBlur    = sh.b;
      ctx.shadowOffsetY = sh.o;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
      ctx.shadowOffsetY = 0;
    }
  }
}