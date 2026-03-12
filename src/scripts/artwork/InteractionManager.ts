import { clamp }                              from '../utils.js';
import { addPointerListeners, type NormPointer } from '../pointer.js';
import type { Square }                           from './Square.js';

export interface InteractionCallbacks {
  onPointerMove?:  (x: number, y: number) => void;
  onPointerLeave?: () => void;
  onLayerClick?:   (layerIndex: number) => void;
  onHoverChange?:  (layerIndex: number, label: string) => void;
  onHoverLeave?:   () => void;
}

/**
 * Attaches pointer event listeners to the canvas wrapper and translates
 * DOM events into artwork-level concepts:
 *
 *   • Pointer position in canvas-local pixels
 *   • Which layer (if any) is hovered
 *   • Click on a specific layer
 *   • Velocity-based ripple triggers on fast pointer movement
 *
 * Mouse + touch normalisation is delegated to the shared `pointer.ts` helper.
 */
export class InteractionManager {
  pointerX = 0;
  pointerY = 0;
  pointerInside = false;

  private hoveredIndex = -1;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private rippleCooldownMs = 0;

  private readonly callbacks:               InteractionCallbacks;
  private readonly rippleVelocityThreshold: number;
  private readonly rippleCooldownTotal:     number;
  private readonly removePointerListeners:  () => void;

  constructor(
    private readonly wrapEl:   HTMLElement,
    private readonly canvasEl: HTMLCanvasElement,
    private readonly layers:   Square[],
    private readonly layerLabels: string[],
    callbacks: InteractionCallbacks = {},
    rippleVelocityThreshold = 10,
    rippleCooldownMs        = 700,
  ) {
    this.callbacks               = callbacks;
    this.rippleVelocityThreshold = rippleVelocityThreshold;
    this.rippleCooldownTotal     = rippleCooldownMs;

    // Pointer position arrives as normalised [0,1]; convert to canvas pixels.
    this.removePointerListeners = addPointerListeners(
      wrapEl,
      ({ x, y }: NormPointer) => {
        const rect     = canvasEl.getBoundingClientRect();
        this.pointerX  = x * rect.width;
        this.pointerY  = y * rect.height;
        this.pointerInside = true;
        callbacks.onPointerMove?.(this.pointerX, this.pointerY);
      },
      () => {
        this.pointerInside = false;
        this.updateHover(-1);
        callbacks.onPointerLeave?.();
      },
    );

    wrapEl.addEventListener('click', this.onClick);
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  tick(dt: number, canvasW: number, canvasH: number): void {
    this.rippleCooldownMs = Math.max(0, this.rippleCooldownMs - dt);

    if (this.pointerInside) {
      const speed = Math.hypot(
        this.pointerX - this.lastPointerX,
        this.pointerY - this.lastPointerY,
      );
      if (speed > this.rippleVelocityThreshold && this.rippleCooldownMs <= 0) {
        this.triggerRipple(speed);
        this.rippleCooldownMs = this.rippleCooldownTotal;
      }
      this.updateHover(this.hitTest(this.pointerX, this.pointerY, canvasW, canvasH));
    }

    this.lastPointerX = this.pointerX;
    this.lastPointerY = this.pointerY;
  }

  triggerRipple(speed: number): void {
    const strength = clamp(speed / 90, 0.06, 1);
    this.layers.forEach((sq, i) => {
      setTimeout(() => {
        sq.rippleH = clamp(sq.rippleH + (Math.random() - 0.5) * strength * 24, -30, 30);
        sq.rippleL = clamp(sq.rippleL + (Math.random() - 0.5) * strength * 9,  -13, 13);
      }, i * 140);
    });
  }

  destroy(): void {
    this.removePointerListeners();
    this.wrapEl.removeEventListener('click', this.onClick);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private hitTest(x: number, y: number, canvasW: number, canvasH: number): number {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const b = this.layers[i].bounds(canvasW, canvasH);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
    }
    return -1;
  }

  private updateHover(index: number): void {
    if (this.hoveredIndex === index) return;
    this.hoveredIndex = index;
    this.layers.forEach((sq, i) => sq.hovSp.to(i === index ? 1 : 0));

    if (index >= 0) {
      this.callbacks.onHoverChange?.(index, this.layerLabels[index] ?? `Layer ${index + 1}`);
    } else {
      this.callbacks.onHoverLeave?.();
    }
  }

  private readonly onClick = (e: MouseEvent): void => {
    const rect = this.canvasEl.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const hit  = this.hitTest(x, y, this.canvasEl.offsetWidth, this.canvasEl.offsetHeight);
    if (hit >= 0) this.callbacks.onLayerClick?.(hit);
  };
}