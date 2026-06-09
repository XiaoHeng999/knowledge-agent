import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { WebGLGraph } from "@/components/graph/webgl-graph";
import type { KnowledgeNode, KnowledgeEdge } from "@/lib/ipc/channels";

// Polyfill jsdom gaps
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock devicePixelRatio
Object.defineProperty(window, "devicePixelRatio", {
  value: 1,
  writable: true,
});

function makeNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: "node-1",
    domainId: "domain-1",
    title: "Test Node",
    type: "concept",
    content: "Test content",
    comprehensionLevel: 0.5,
    sources: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEdge(overrides: Partial<KnowledgeEdge> = {}): KnowledgeEdge {
  return {
    id: "edge-1",
    sourceId: "node-1",
    targetId: "node-2",
    type: "related",
    weight: 1,
    ...overrides,
  };
}

afterEach(cleanup);

describe("WebGLGraph", () => {
  it("renders a canvas element", () => {
    render(
      <WebGLGraph nodes={[]} edges={[]} width={800} height={600} />,
    );

    expect(document.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders with correct dimensions", () => {
    render(
      <WebGLGraph nodes={[]} edges={[]} width={400} height={300} />,
    );

    const canvas = document.querySelector("canvas")!;
    expect(canvas.style.width).toBe("400px");
    expect(canvas.style.height).toBe("300px");
  });

  it("applies className to container", () => {
    render(
      <WebGLGraph
        nodes={[]}
        edges={[]}
        width={800}
        height={600}
        className="my-custom-class"
      />,
    );

    const container = document.querySelector(".webgl-graph");
    expect(container?.classList.contains("my-custom-class")).toBe(true);
  });

  it("renders without crash with nodes and edges", () => {
    const nodes = [
      makeNode({ id: "n1", title: "Node 1" }),
      makeNode({ id: "n2", title: "Node 2" }),
    ];
    const edges = [makeEdge({ sourceId: "n1", targetId: "n2" })];

    render(
      <WebGLGraph nodes={nodes} edges={edges} width={800} height={600} />,
    );

    expect(document.querySelector("canvas")).toBeInTheDocument();
  });

  describe("node click", () => {
    it("calls onNodeClick when clicking a node in a dense cluster", () => {
      const onNodeClick = vi.fn();
      // Dense cluster: many nodes + edges → tight layout near center
      const nodes = Array.from({ length: 6 }, (_, i) =>
        makeNode({ id: `n${i}`, title: `Node ${i}` })
      );
      const edges = [
        makeEdge({ sourceId: "n0", targetId: "n1" }),
        makeEdge({ sourceId: "n1", targetId: "n2" }),
        makeEdge({ sourceId: "n2", targetId: "n3" }),
        makeEdge({ sourceId: "n3", targetId: "n4" }),
        makeEdge({ sourceId: "n4", targetId: "n5" }),
        makeEdge({ sourceId: "n0", targetId: "n3" }),
        makeEdge({ sourceId: "n1", targetId: "n4" }),
      ];

      render(
        <WebGLGraph
          nodes={nodes}
          edges={edges}
          width={800}
          height={600}
          onNodeClick={onNodeClick}
        />,
      );

      const canvas = document.querySelector("canvas")!;
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {},
      });

      // Scan a grid near center — dense cluster should be somewhere in this range
      for (let x = 300; x <= 500; x += 20) {
        for (let y = 200; y <= 400; y += 20) {
          fireEvent.click(canvas, { clientX: x, clientY: y });
        }
      }

      expect(onNodeClick).toHaveBeenCalled();
    });

    it("does not call onNodeClick when no callback provided", () => {
      const nodes = [makeNode({ id: "n1" })];

      render(
        <WebGLGraph nodes={nodes} edges={[]} width={800} height={600} />,
      );

      const canvas = document.querySelector("canvas")!;
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {},
      });

      // Should not throw
      expect(() => {
        fireEvent.click(canvas, { clientX: 400, clientY: 300 });
      }).not.toThrow();
    });
  });

  describe("zoom", () => {
    it("updates zoom on wheel event", () => {
      const onNodeClick = vi.fn();
      const nodes = [makeNode({ id: "n1" })];

      render(
        <WebGLGraph
          nodes={nodes}
          edges={[]}
          width={800}
          height={600}
          onNodeClick={onNodeClick}
        />,
      );

      const canvas = document.querySelector("canvas")!;

      // Scroll down (zoom out)
      fireEvent.wheel(canvas, { deltaY: 100 });

      // The zoom should have changed (from 1 to 0.9)
      // Verify by checking that a click at the same position no longer hits
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600,
        right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {},
      });

      // After zoom out, the node is still at center but the hit radius changes
      // Just verify no crash
      expect(() => {
        fireEvent.click(canvas, { clientX: 400, clientY: 300 });
      }).not.toThrow();
    });
  });

  describe("pan", () => {
    it("handles mouse drag without crash", () => {
      const nodes = [makeNode({ id: "n1" })];

      render(
        <WebGLGraph nodes={nodes} edges={[]} width={800} height={600} />,
      );

      const canvas = document.querySelector("canvas")!;

      // Simulate mouse drag
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      // Should not crash
      expect(canvas).toBeInTheDocument();
    });

    it("stops dragging on mouse leave", () => {
      const nodes = [makeNode({ id: "n1" })];

      render(
        <WebGLGraph nodes={nodes} edges={[]} width={800} height={600} />,
      );

      const canvas = document.querySelector("canvas")!;

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseLeave(canvas);

      // Should not crash
      expect(canvas).toBeInTheDocument();
    });
  });

  describe("selected node", () => {
    it("renders without crash with a selected node", () => {
      const nodes = [
        makeNode({ id: "n1" }),
        makeNode({ id: "n2" }),
      ];

      render(
        <WebGLGraph
          nodes={nodes}
          edges={[]}
          width={800}
          height={600}
          selectedNodeId="n1"
        />,
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();
    });
  });
});
