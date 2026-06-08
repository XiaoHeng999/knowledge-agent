import { getDatabaseService } from "../db/index";
import { getPiMonoWrapper } from "../pi-mono/instance";

export async function resolveModelId(domainId: string, preferredModelId?: string): Promise<string> {
  if (preferredModelId) return preferredModelId;

  const db = getDatabaseService();
  const domain = db.domains.findById(domainId);
  if (domain?.default_expert_model) return domain.default_expert_model;

  const wrapper = getPiMonoWrapper();
  const models = await wrapper.listAvailableModels();
  if (models.length > 0) return models[0].id;

  throw new Error("No model available. Configure a model or add an API key.");
}
