import { registerHandler } from "../handler";
import { SKILL_CHANNELS } from "../../../src/lib/ipc/channels";
import * as skillEngine from "../../services/skill-engine";

export function registerSkillHandlers(): void {
  registerHandler(SKILL_CHANNELS.LIST, async (_event, req) => {
    const items = skillEngine.listSkills(req.domainId);
    return { items };
  });

  registerHandler(SKILL_CHANNELS.GET, async (_event, req) => {
    return skillEngine.getSkill(req.id);
  });

  registerHandler(SKILL_CHANNELS.TOGGLE, async (_event, req) => {
    skillEngine.toggleSkill(req.id, req.enabled);
  });

  registerHandler(SKILL_CHANNELS.EXECUTE, async (_event, req) => {
    return skillEngine.executeSkill(req.skillId, req.domainId, req.input, req.modelId);
  });

  registerHandler(SKILL_CHANNELS.CANCEL, async (_event, req) => {
    const cancelled = skillEngine.cancelExecution(req.id);
    return { cancelled };
  });

  registerHandler(SKILL_CHANNELS.METRICS, async (_event, req) => {
    return skillEngine.getSkillMetrics(req.skillId);
  });

  registerHandler(SKILL_CHANNELS.RATE, async (_event, req) => {
    skillEngine.rateSkill(req.skillId, req.rating);
  });

  registerHandler(SKILL_CHANNELS.REGISTER_DOMAIN, async (_event, req) => {
    const registered = await skillEngine.registerDomainSkills(req.domainId, req.domainSlug);
    return { registered };
  });
}
