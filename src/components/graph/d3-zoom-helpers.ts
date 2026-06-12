import { Selection } from 'd3-selection';
import { zoom as d3Zoom, ZoomBehavior, zoomIdentity } from 'd3-zoom';

type SVGSelection = Selection<SVGSVGElement, unknown, null, undefined>;
type GSelection = Selection<SVGGElement, unknown, null, undefined>;

interface AttachZoomOptions {
  scaleExtent?: [number, number];
  initialCenter?: { width: number; height: number };
}

// D3's .call() on both Selection and Transition has incomplete generic
// signatures — the overload for `(callback, ...args)` is too narrow.
// This internal helper centralises the necessary cast.
/* eslint-disable @typescript-eslint/no-explicit-any */
function callOnSelection<S extends Selection<any, any, any, any>>(
  selection: S,
  fn: (...args: any[]) => void,
  ...args: any[]
): void {
  (selection as any).call(fn, ...args);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function attachZoomBehavior(
  svg: SVGSelection,
  container: GSelection,
  options?: AttachZoomOptions,
): ZoomBehavior<SVGSVGElement, unknown> {
  const extent = options?.scaleExtent ?? [0.1, 4];

  const behavior = d3Zoom<SVGSVGElement, unknown>()
    .scaleExtent(extent)
    .on('zoom', (event) => {
      container.attr('transform', event.transform.toString());
    });

  callOnSelection(svg, behavior);

  if (options?.initialCenter) {
    const { width, height } = options.initialCenter;
    callOnSelection(svg, behavior.transform, zoomIdentity.translate(width / 2, height / 2));
  }

  return behavior;
}

export function zoomIn(svg: SVGSelection, scale = 1.4, duration = 300): void {
  const behavior = d3Zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transition = (svg.transition().duration(duration) as any);
  transition.call(behavior.scaleBy, scale);
}

export function zoomOut(svg: SVGSelection, scale = 0.7, duration = 300): void {
  const behavior = d3Zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transition = (svg.transition().duration(duration) as any);
  transition.call(behavior.scaleBy, scale);
}

export function zoomReset(svg: SVGSelection, duration = 500): void {
  const behavior = d3Zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transition = (svg.transition().duration(duration) as any);
  transition.call(behavior.transform, zoomIdentity);
}

// D3's .merge() has a known type incompatibility between enter and update
// selections. This helper centralises the cast so callers stay clean.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mergeSelections<GElement extends Element, Datum>(
  enter: Selection<GElement, Datum, any, any>,
  update: Selection<GElement, Datum, any, any>,
): Selection<GElement, Datum, any, any> {
  return enter.merge(update as any);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
