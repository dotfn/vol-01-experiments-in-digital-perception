// ─── Palettes ────────────────────────────────────────────────────────────────
// Each palette has 5 stops: [hue, saturation, lightness] per layer (outer → inner)

export type HSLTuple = [number, number, number];
export type Palette   = [HSLTuple, HSLTuple, HSLTuple, HSLTuple, HSLTuple];

export const PALETTES: Palette[] = [
  [[22, 10, 8],  [18, 55, 20],  [28, 68, 38],  [38, 72, 60],  [45, 55, 82]],
  [[208, 22, 7], [212, 72, 17], [208, 66, 34],  [198, 56, 57], [185, 46, 79]],
  [[350, 14, 8], [348, 65, 19], [5, 72, 36],    [18, 70, 58],  [35, 55, 84]],
  [[0, 0, 7],    [218, 78, 20], [2, 75, 35],    [44, 88, 55],  [50, 68, 87]],
  [[148, 14, 7], [140, 52, 17], [110, 44, 33],  [82, 52, 55],  [60, 50, 79]],
  [[258, 16, 8], [268, 58, 19], [278, 62, 36],  [298, 52, 58], [318, 42, 82]],
  [[20, 18, 7],  [15, 60, 18],  [25, 70, 34],   [35, 72, 52],  [45, 60, 78]],
];

export const PALETTE_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

// Size ratios for each layer (index 0 = outermost)
export const LAYER_SIZE_RATIOS  = [1, 0.755, 0.570, 0.430, 0.323] as const;

// Upward offset ratios so layers appear stacked, not perfectly centred
export const LAYER_OFFSET_RATIOS = [0, 0.026, 0.050, 0.068, 0.082] as const;

// How many layers the artwork renders
export const LAYER_COUNT = 5;

// Canvas background colour
export const BG_COLOR = '#0B0907';