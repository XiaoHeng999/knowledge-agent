'use client';

import type { MemoryLayerStats } from '@/lib/ipc/channels';

interface MemoryLayerBarProps {
  stats: MemoryLayerStats;
}

export function MemoryLayerBar({ stats }: MemoryLayerBarProps) {
  const total = Math.max(stats.total, 1);

  return (
    <div className="memory-layer-bar">
      <span className="memory-layer-bar__label">Memory Layers</span>
      <div className="memory-layer-bar__track">
        <div
          className="memory-layer-bar__segment memory-layer-bar__segment--hot"
          style={{ width: `${(stats.hot / total) * 100}%` }}
          title={`Hot (24h): ${stats.hot}`}
        />
        <div
          className="memory-layer-bar__segment memory-layer-bar__segment--warm"
          style={{ width: `${(stats.warm / total) * 100}%` }}
          title={`Warm (30d): ${stats.warm}`}
        />
        <div
          className="memory-layer-bar__segment memory-layer-bar__segment--cold"
          style={{ width: `${(stats.cold / total) * 100}%` }}
          title={`Cold (>30d): ${stats.cold}`}
        />
      </div>
      <div className="memory-layer-bar__legend">
        <span className="memory-layer-bar__legend-item">
          <span className="memory-layer-bar__dot memory-layer-bar__dot--hot" />
          Hot {stats.hot}
        </span>
        <span className="memory-layer-bar__legend-item">
          <span className="memory-layer-bar__dot memory-layer-bar__dot--warm" />
          Warm {stats.warm}
        </span>
        <span className="memory-layer-bar__legend-item">
          <span className="memory-layer-bar__dot memory-layer-bar__dot--cold" />
          Cold {stats.cold}
        </span>
        <span className="memory-layer-bar__total">{stats.total} total</span>
      </div>
    </div>
  );
}
