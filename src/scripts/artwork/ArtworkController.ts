import { Square }             from './Square.ts';
import { PaletteManager }    from './PaletteManager.ts';
import { CanvasManager }     from '../CanvasManager.ts';
import { ModeManager }       from './ModeManager.ts';
import { InteractionManager } from './InteractionManager.ts';
import { Renderer }          from './Renderer.ts';
import { LAYER_COUNT }       from './constants.ts';

export interface ArtworkConfig {
  /** The <canvas> element */
  canvas: HTMLCanvasElement;
  /** The wrapper element that receives pointer events */
  wrapEl: HTMLElement;

  /** i18n strings */
  labels: {
    layers:        string[];   // length must equal LAYER_COUNT
    ambient:       string;
    contemplative: string;
  };

  /** Optional UI element callbacks */
  onPaletteChange?:  (name: string) => void;
  onModeChange?:     (label: string) => void;
  onHoverChange?:    (layerIndex: number, label: string) => void;
  onHoverLeave?:     () => void;
  onLayerClick?:     (layerIndex: number) => void;
  onCursorEnter?:    () => void;
  onCursorLeave?:    () => void;
}

/**
 * Top-level controller for the artwork canvas.
 *
 * Instantiates and connects all sub-managers, then drives the
 * `requestAnimationFrame` loop.  Call `destroy()` to clean up
 * event listeners and stop the loop.
 */
export class ArtworkController {
  private readonly squares:      Square[];
  private readonly canvas:       CanvasManager;
  private readonly palette:      PaletteManager;
  private readonly mode:         ModeManager;
  private readonly interaction:  InteractionManager;
  private readonly renderer:     Renderer;

  private rafId:  number | null = null;
  private lastTs: number = 0;
  private alive   = true;

  constructor(private readonly config: ArtworkConfig) {
    // ── Layers ────────────────────────────────────────────────────────────
    this.squares = Array.from(
      { length: LAYER_COUNT },
      (_, i) => new Square(i),
    );

    // ── Canvas ────────────────────────────────────────────────────────────
    this.canvas = new CanvasManager(config.canvas);

    // ── Palette ───────────────────────────────────────────────────────────
    this.palette = new PaletteManager({
      onPaletteChange: config.onPaletteChange,
    });

    // ── Mode ──────────────────────────────────────────────────────────────
    this.mode = new ModeManager(
      {
        onEnterContemplative: () => {
          config.onModeChange?.(config.labels.contemplative);
        },
        onExitContemplative: () => {
          config.onModeChange?.(config.labels.ambient);
          // Subtle ripple on mode exit
          this.triggerRipple(20);
        },
        onCyclePulse: () => {
          this.palette.advance();
          this.triggerRipple(55);
        },
      },
      {
        ambient:       config.labels.ambient,
        contemplative: config.labels.contemplative,
      },
    );

    // ── Interaction ───────────────────────────────────────────────────────
    this.interaction = new InteractionManager(
      config.wrapEl,
      config.canvas,
      this.squares,
      config.labels.layers,
      {
        onPointerMove: () => {
          this.mode.notifyPointerMove();
          config.onCursorEnter?.();
        },
        onPointerLeave: () => {
          this.mode.notifyPointerLeave();
          config.onCursorLeave?.();
        },
        onHoverChange: config.onHoverChange,
        onHoverLeave:  config.onHoverLeave,
        onLayerClick:  config.onLayerClick,
      },
    );

    // ── Renderer ──────────────────────────────────────────────────────────
    this.renderer = new Renderer(this.canvas);

    // ── Start loop ────────────────────────────────────────────────────────
    this.rafId = requestAnimationFrame(this.loop);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Stop the animation loop and remove all event listeners. */
  destroy(): void {
    this.alive = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.canvas.destroy();
    this.interaction.destroy();
  }

  // ─── Animation loop ───────────────────────────────────────────────────────

  private readonly loop = (ts: number): void => {
    if (!this.alive) return;
    this.rafId = requestAnimationFrame(this.loop);

    // Cap dt to avoid a huge jump after the tab regains focus
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    const { width, height } = this.canvas;
    const { pointerX, pointerY, pointerInside } = this.interaction;
    const isContemplative = this.mode.isContemplative;

    // ── Tick subsystems ───────────────────────────────────────────────────
    this.mode.tick(dt);
    this.interaction.tick(dt, width, height);
    this.palette.tick(dt, isContemplative, this.squares);

    // ── Update physics for each layer ─────────────────────────────────────
    this.squares.forEach(sq =>
      sq.update(ts, pointerX, pointerY, pointerInside, width, height)
    );

    // ── Draw ──────────────────────────────────────────────────────────────
    this.renderer.draw(
      this.squares,
      isContemplative,
      pointerInside,
      pointerX, pointerY,
      ts,
    );
  };

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Delegate ripple to the interaction manager. */
  private triggerRipple(speed: number): void {
    this.interaction.triggerRipple(speed);
  }
}