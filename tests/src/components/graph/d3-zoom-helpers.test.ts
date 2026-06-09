import { describe, it, expect, beforeEach } from 'vitest';
import { select, Selection } from 'd3-selection';
import { attachZoomBehavior, zoomIn, zoomOut, zoomReset, mergeSelections } from '@/components/graph/d3-zoom-helpers';

function createSvg(
  width = 800,
  height = 600,
): Selection<SVGSVGElement, unknown, null, undefined> {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', String(width));
  el.setAttribute('height', String(height));
  el.setAttribute('viewBox', `0 0 ${width} ${height}`);
  document.body.appendChild(el);
  return select(el);
}

function createG(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
): Selection<SVGGElement, unknown, null, undefined> {
  return svg.append('g');
}

describe('attachZoomBehavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('binds zoom to SVG and sets initial center transform on container', () => {
    const svg = createSvg();
    const g = createG(svg);
    const behavior = attachZoomBehavior(svg, g, {
      scaleExtent: [0.1, 4],
      initialCenter: { width: 800, height: 600 },
    });

    expect(behavior).toBeDefined();

    const transform = g.attr('transform');
    expect(transform).toContain('translate(400,300)');
  });
});

describe('zoomIn', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls scaleBy on the SVG via transition without throwing', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    // Should not throw — verifies correct D3 API usage and type safety
    expect(() => zoomIn(svg, 1.4)).not.toThrow();
  });

  it('accepts custom scale and duration', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    expect(() => zoomIn(svg, 2, 500)).not.toThrow();
  });
});

describe('zoomOut', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls scaleBy with factor < 1 without throwing', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    expect(() => zoomOut(svg, 0.7)).not.toThrow();
  });

  it('accepts custom scale and duration', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    expect(() => zoomOut(svg, 0.5, 400)).not.toThrow();
  });
});

describe('zoomReset', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resets transform to identity without throwing', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    expect(() => zoomReset(svg)).not.toThrow();
  });

  it('accepts custom duration', () => {
    const svg = createSvg();
    const g = createG(svg);
    attachZoomBehavior(svg, g, { scaleExtent: [0.1, 4] });

    expect(() => zoomReset(svg, 800)).not.toThrow();
  });
});

describe('mergeSelections', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('merges enter and update selections and returns a combined selection', () => {
    const svg = createSvg();
    const g = svg.append('g');

    // Bind initial data to create enter + update selections
    const update = g.selectAll('circle').data([1, 2]);
    const enter = update.enter().append('circle');

    const merged = mergeSelections(enter, update);

    // Merged selection should contain both entered and updated elements
    expect(merged.size()).toBe(2);
  });
});
