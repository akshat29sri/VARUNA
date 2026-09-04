// Scientific Oceanographic Colormaps

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Turbo Colormap (Google's perceptual rainbow for Ocean Temperature)
const TURBO_STOPS: [number, RGB][] = [
  [0.0, { r: 48, g: 18, b: 59 }],     // Deep purple/cold
  [0.15, { r: 70, g: 134, b: 251 }],  // Blue
  [0.35, { r: 27, g: 229, b: 181 }],  // Cyan
  [0.55, { r: 164, g: 252, b: 60 }],  // Green-Yellow
  [0.75, { r: 251, g: 185, b: 56 }],  // Orange
  [0.9, { r: 227, g: 68, b: 28 }],    // Red-Orange
  [1.0, { r: 122, g: 4, b: 3 }],      // Dark Red
];

// Haline Colormap (Ocean Salinity - Deep blue/cyan to vibrant yellow/amber)
const HALINE_STOPS: [number, RGB][] = [
  [0.0, { r: 15, g: 32, b: 67 }],     // Low salinity deep indigo
  [0.2, { r: 24, g: 88, b: 160 }],    // Blue
  [0.4, { r: 38, g: 166, b: 154 }],   // Teal/Cyan
  [0.6, { r: 94, g: 204, b: 109 }],   // Green
  [0.8, { r: 234, g: 200, b: 60 }],   // Golden Yellow
  [1.0, { r: 239, g: 108, b: 0 }],    // High salinity amber
];

// Velocity / Current Speed Colormap (Dark slate/indigo to electric cyan to bright magenta)
const VELOCITY_STOPS: [number, RGB][] = [
  [0.0, { r: 10, g: 25, b: 47 }],     // Calm
  [0.25, { r: 14, g: 116, b: 144 }],  // Mild
  [0.5, { r: 6, g: 182, b: 212 }],    // Moderate current
  [0.75, { r: 168, g: 85, b: 247 }],  // Fast current
  [1.0, { r: 244, g: 63, b: 94 }],    // Intense jet
];

// Chlorophyll-a Colormap (Deep blue -> Seafoam -> Lush Green -> Gold)
const CHLOROPHYLL_STOPS: [number, RGB][] = [
  [0.0, { r: 8, g: 24, b: 68 }],
  [0.3, { r: 16, g: 120, b: 100 }],
  [0.6, { r: 34, g: 197, b: 94 }],
  [1.0, { r: 234, g: 179, b: 8 }],
];

// Dissolved Oxygen Colormap (Violet to Aqua to White)
const OXYGEN_STOPS: [number, RGB][] = [
  [0.0, { r: 88, g: 28, b: 135 }],    // Hypoxic
  [0.3, { r: 30, g: 64, b: 175 }],
  [0.6, { r: 14, g: 165, b: 233 }],
  [1.0, { r: 240, g: 253, b: 250 }],  // Well-oxygenated
];

function interpolateRGB(c1: RGB, c2: RGB, factor: number): RGB {
  return {
    r: Math.round(c1.r + factor * (c2.r - c1.r)),
    g: Math.round(c1.g + factor * (c2.g - c1.g)),
    b: Math.round(c1.b + factor * (c2.b - c1.b)),
  };
}

export function sampleColormap(
  value: number,
  min: number,
  max: number,
  colormap: 'turbo' | 'haline' | 'velocity' | 'chlorophyll' | 'oxygen'
): RGB {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  let stops = TURBO_STOPS;
  if (colormap === 'haline') stops = HALINE_STOPS;
  else if (colormap === 'velocity') stops = VELOCITY_STOPS;
  else if (colormap === 'chlorophyll') stops = CHLOROPHYLL_STOPS;
  else if (colormap === 'oxygen') stops = OXYGEN_STOPS;

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (normalized >= t0 && normalized <= t1) {
      const factor = (normalized - t0) / (t1 - t0);
      return interpolateRGB(c0, c1, factor);
    }
  }

  return stops[stops.length - 1][1];
}

export function sampleColormapCSS(
  value: number,
  min: number,
  max: number,
  colormap: 'turbo' | 'haline' | 'velocity' | 'chlorophyll' | 'oxygen'
): string {
  const { r, g, b } = sampleColormap(value, min, max, colormap);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getColormapGradientCSS(colormap: 'turbo' | 'haline' | 'velocity' | 'chlorophyll' | 'oxygen'): string {
  let stops = TURBO_STOPS;
  if (colormap === 'haline') stops = HALINE_STOPS;
  else if (colormap === 'velocity') stops = VELOCITY_STOPS;
  else if (colormap === 'chlorophyll') stops = CHLOROPHYLL_STOPS;
  else if (colormap === 'oxygen') stops = OXYGEN_STOPS;

  const gradientParts = stops.map(([pos, rgb]) => `rgb(${rgb.r},${rgb.g},${rgb.b}) ${Math.round(pos * 100)}%`);
  return `linear-gradient(to right, ${gradientParts.join(', ')})`;
}
