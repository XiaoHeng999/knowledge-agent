import { describe, it, expect } from 'vitest';
import { buildCircleFan, CIRCLE_SEGMENTS } from '@/components/graph/webgl-circle';

describe('buildCircleFan', () => {
  it('produces correct vertex count: segments × 3 vertices × 6 floats', () => {
    const verts = buildCircleFan(100, 200, 10, 1, 0.5, 0, 0.8);
    expect(verts.length).toBe(CIRCLE_SEGMENTS * 3 * 6);
  });

  it('first triangle has center as first vertex', () => {
    const verts = buildCircleFan(100, 200, 10, 0.3, 0.6, 0.9, 0.7);
    expect(verts[0]).toBeCloseTo(100);
    expect(verts[1]).toBeCloseTo(200);
    expect(verts[2]).toBeCloseTo(0.3);
    expect(verts[3]).toBeCloseTo(0.6);
    expect(verts[4]).toBeCloseTo(0.9);
    expect(verts[5]).toBeCloseTo(0.7);
  });

  it('places perimeter vertices on a circle of the given radius', () => {
    const verts = buildCircleFan(0, 0, 50, 1, 1, 1, 1);
    const step = (2 * Math.PI) / CIRCLE_SEGMENTS;

    const px = verts[6];
    const py = verts[7];
    expect(px).toBeCloseTo(50 * Math.cos(0));
    expect(py).toBeCloseTo(50 * Math.sin(0));

    const p1x = verts[12];
    const p1y = verts[13];
    expect(p1x).toBeCloseTo(50 * Math.cos(step));
    expect(p1y).toBeCloseTo(50 * Math.sin(step));
  });

  it('last segment closes back to the first perimeter point', () => {
    const verts = buildCircleFan(0, 0, 10, 1, 1, 1, 1);
    const step = (2 * Math.PI) / CIRCLE_SEGMENTS;

    const lastTriStart = (CIRCLE_SEGMENTS - 1) * 3 * 6;
    const closeX = verts[lastTriStart + 12];
    const closeY = verts[lastTriStart + 13];
    expect(closeX).toBeCloseTo(10 * Math.cos(step * CIRCLE_SEGMENTS));
    expect(closeY).toBeCloseTo(10 * Math.sin(step * CIRCLE_SEGMENTS));
  });

  it('all perimeter vertices are at distance r from center', () => {
    const cx = 50, cy = 75, r = 20;
    const verts = buildCircleFan(cx, cy, r, 1, 1, 1, 1);

    for (let seg = 0; seg < CIRCLE_SEGMENTS; seg++) {
      for (const vi of [1, 2]) {
        const idx = seg * 18 + vi * 6;
        const dx = verts[idx] - cx;
        const dy = verts[idx + 1] - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeCloseTo(r, 5);
      }
    }
  });

  it('applies the same color to all vertices', () => {
    const verts = buildCircleFan(0, 0, 10, 0.2, 0.4, 0.6, 0.8);
    for (let i = 0; i < verts.length / 6; i++) {
      const idx = i * 6;
      expect(verts[idx + 2]).toBeCloseTo(0.2);
      expect(verts[idx + 3]).toBeCloseTo(0.4);
      expect(verts[idx + 4]).toBeCloseTo(0.6);
      expect(verts[idx + 5]).toBeCloseTo(0.8);
    }
  });
});
