"use client";

import { useEffect, useState, useCallback } from "react";
import { useModelStore } from "@/stores/model-store";
import { useDomainStore } from "@/stores/domain-store";
import type { ModelInfo } from "@/lib/ipc/channels";

const ROLES = [
  { key: "expert", label: "Expert Chat", description: "Default model for expert conversations" },
  { key: "research", label: "Research", description: "Default model for research agent" },
  { key: "summary", label: "Summary", description: "Default model for summarization" },
] as const;

export function DomainModelConfig() {
  const domains = useDomainStore((s) => s.domains);
  const models = useModelStore((s) => s.models);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const fetchDefaultModel = useModelStore((s) => s.fetchDefaultModel);
  const setDefaultModel = useModelStore((s) => s.setDefaultModel);
  const domainDefaults = useModelStore((s) => s.domainDefaults);

  const available = models.filter((m) => m.available);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    for (const domain of domains) {
      for (const role of ROLES) {
        fetchDefaultModel("domain", domain.id, role.key);
      }
    }
  }, [domains, fetchDefaultModel]);

  const handleSetDefault = useCallback(
    async (domainId: string, role: string, model: ModelInfo) => {
      await setDefaultModel({
        providerId: model.provider,
        modelId: model.id,
        scope: "domain",
        domainId,
        role,
      });
    },
    [setDefaultModel],
  );

  if (domains.length === 0) {
    return (
      <div className="domain-model-config__empty">
        Create a domain first to configure default models.
      </div>
    );
  }

  return (
    <div className="domain-model-config">
      {domains.map((domain) => (
        <div key={domain.id} className="domain-model-config__domain">
          <div className="domain-model-config__domain-header">
            <span
              className="domain-model-config__domain-dot"
              style={{ backgroundColor: domain.color }}
            />
            <span className="domain-model-config__domain-name">{domain.name}</span>
          </div>
          <div className="domain-model-config__roles">
            {ROLES.map((role) => {
              const currentDefault = domainDefaults[domain.id]?.[role.key];
              return (
                <div key={role.key} className="domain-model-config__role">
                  <div className="domain-model-config__role-info">
                    <span className="domain-model-config__role-label">{role.label}</span>
                    <span className="domain-model-config__role-desc">{role.description}</span>
                  </div>
                  <select
                    className="domain-model-config__select"
                    value={currentDefault?.modelId ?? ""}
                    onChange={(e) => {
                      const model = available.find((m) => m.id === e.target.value);
                      if (model) handleSetDefault(domain.id, role.key, model);
                    }}
                  >
                    <option value="">Use global default</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
