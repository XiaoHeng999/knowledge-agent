import { DOMAIN_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as DomainManager from "../../services/domain-manager";
import type { SkillEngine } from "../../services/skill-engine";
import { getDatabaseService } from "../../db/index";
import { extractSlugFromConfigPath } from "../../services/domain-config";

export function registerDomainHandlers(skillEngine: SkillEngine): void {
  registerHandler(DOMAIN_CHANNELS.CREATE, async (_event, req) => {
    const domain = await DomainManager.createDomain(req);
    try {
      const db = getDatabaseService();
      const domainRow = db.domains.findById(domain.id);
      if (domainRow) {
        const slug = extractSlugFromConfigPath(domainRow.config_path);
        if (slug) await skillEngine.registerDomainSkills(domain.id, slug);
      }
    } catch { /* non-critical */ }
    return domain;
  });

  registerHandler(DOMAIN_CHANNELS.UPDATE_CONFIG, async (_event, req) => {
    const result = await DomainManager.updateDomainConfig(req.id, req.config);
    try {
      const db = getDatabaseService();
      const domainRow = db.domains.findById(req.id);
      if (domainRow) {
        const slug = extractSlugFromConfigPath(domainRow.config_path);
        if (slug) await skillEngine.registerDomainSkills(req.id, slug);
      }
    } catch { /* non-critical */ }
    return { config: result };
  });
}
