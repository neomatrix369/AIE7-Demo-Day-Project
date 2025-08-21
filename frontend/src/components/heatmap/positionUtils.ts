import { HeatmapPoint } from '../../utils/heatmapData';
import { GRID_JITTER_PX, GRID_MARGIN_PX } from './heatmapTheme';

export interface GridPositionOptions {
  margin?: number; // px margin inside canvas
  jitter?: number; // max jitter amplitude in px
}

// Deterministic pseudo-random based on id
function seededJitter(id: string, index: number) {
  const seed = (id || `${index}`)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const randA = ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;
  const randB = ((seed * 7927 + 12345) % 217728) / 217728 - 0.5;
  return { randA, randB };
}

export function computeGridPositions(
  points: HeatmapPoint[],
  canvasWidth: number,
  canvasHeight: number,
  options?: GridPositionOptions
): HeatmapPoint[] {
  const margin = options?.margin ?? GRID_MARGIN_PX;
  const jitterMax = options?.jitter ?? GRID_JITTER_PX;

  if (!points || points.length === 0) return [];

  const cols = Math.ceil(Math.sqrt(points.length));
  const rows = Math.ceil(points.length / cols);

  return points.map((point, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    const { randA, randB } = seededJitter(point.id, index);
    const jitterX = randA * jitterMax;
    const jitterY = randB * jitterMax;

    const x = (col / Math.max(cols - 1, 1)) * (canvasWidth - margin * 2) + margin + jitterX;
    const y = (row / Math.max(rows - 1, 1)) * (canvasHeight - margin * 2) + margin + jitterY;

    return {
      ...point,
      screenX: Math.max(20, Math.min(canvasWidth - 20, x)),
      screenY: Math.max(20, Math.min(canvasHeight - 20, y))
    };
  });
}


