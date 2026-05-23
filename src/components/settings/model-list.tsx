"use client";

import { useState, useMemo } from "react";
import type { ModelInfo } from "@/lib/ipc/channels";

interface ModelListProps {
  models: ModelInfo[];
  loading: boolean;
}

export function ModelList({ models, loading }: ModelListProps) {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const filtered = useMemo(() => {
    let result = models;
    if (providerFilter) {
      result = result.filter((m) => m.provider === providerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q),
      );
    }
    return result;
  }, [models, search, providerFilter]);

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => m.provider));
    return Array.from(set).sort();
  }, [models]);

  if (loading && models.length === 0) {
    return (
      <div className="model-list__loading">
        <span className="model-list__spinner" />
        Loading models...
      </div>
    );
  }

  return (
    <div className="model-list">
      <div className="model-list__filters">
        <input
          className="model-list__search"
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="model-list__filter"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="">All Providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="model-list__table-wrapper">
        <table className="model-list__table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Model</th>
              <th>Provider</th>
              <th>Context</th>
              <th>Cost/m tokens</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((model) => (
              <ModelRow key={`${model.provider}-${model.id}`} model={model} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="model-list__empty">
                  {models.length === 0 ? "No models available. Add an API key to get started." : "No models match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelRow({ model }: { model: ModelInfo }) {
  const costStr =
    model.costPerMillion > 0 ? `$${model.costPerMillion.toFixed(2)}` : "Free";
  const contextStr =
    model.contextWindow >= 1000000
      ? `${(model.contextWindow / 1000000).toFixed(1)}M`
      : model.contextWindow >= 1000
        ? `${(model.contextWindow / 1000).toFixed(0)}K`
        : String(model.contextWindow);

  return (
    <tr className={`model-list__row ${model.available ? "" : "model-list__row--unavailable"}`}>
      <td>
        <span
          className={`model-list__status model-list__status--${model.available ? "available" : "unavailable"}`}
          title={model.available ? "Available" : "No API key"}
        />
      </td>
      <td className="model-list__name">{model.name}</td>
      <td className="model-list__provider">{model.provider}</td>
      <td className="model-list__context">{contextStr}</td>
      <td className="model-list__cost">{costStr}</td>
    </tr>
  );
}
