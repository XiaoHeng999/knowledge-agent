/** Number of segments used to approximate a circle. */
export const CIRCLE_SEGMENTS = 16;

const TWO_PI = 2 * Math.PI;
const STEP = TWO_PI / CIRCLE_SEGMENTS;

/**
 * Build a triangle-list vertex array for a filled circle.
 *
 * Each of the N segments produces one triangle: (center, p[i], p[i+1]).
 * Layout per vertex: `[x, y, r, g, b, a]`.
 * Returns: N × 3 × 6 floats — compatible with `gl.TRIANGLES` batched draw.
 */
export function buildCircleFan(
  cx: number,
  cy: number,
  radius: number,
  cr: number,
  cg: number,
  cb: number,
  alpha: number,
): number[] {
  const out: number[] = [];

  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = STEP * i;
    const a1 = STEP * (i + 1);
    // Triangle: center → p[i] → p[i+1]
    out.push(cx, cy, cr, cg, cb, alpha);
    out.push(cx + radius * Math.cos(a0), cy + radius * Math.sin(a0), cr, cg, cb, alpha);
    out.push(cx + radius * Math.cos(a1), cy + radius * Math.sin(a1), cr, cg, cb, alpha);
  }

  return out;
}
