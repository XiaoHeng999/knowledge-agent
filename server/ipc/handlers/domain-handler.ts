/**
 * Domain management IPC handlers — wires DOMAIN_CHANNELS to DomainManager service.
 */
import { DOMAIN_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as DomainManager from "../../services/domain-manager";
import * as SkillEngine from "../../services/skill-engine";
import { getDatabaseService } from "../../db/index";

export function registerDomainHandlers(): void {
  registerHandler(DOMAIN_CHANNELS.CREATE, async (_event, req) => {
    const domain = await DomainManager.createDomain(req);
    // Register domain-specific skills after domain creation
    try {
      const db = getDatabaseService();
      const domainRow = db.domains.findById(domain.id);
      if (domainRow) {
        const slug = domainRow.config_path.split("/").filter(Boolean).pop() ?? "";
        if (slug) await SkillEngine.registerDomainSkills(domain.id, slug);
      }
    } catch { /* non-critical */ }
    return domain;
  });

  registerHandler(DOMAIN_CHANNELS.LIST, async () => {
    const domains = DomainManager.listDomains();
    return { domains };
  });

  registerHandler(DOMAIN_CHANNELS.GET, async (_event, req) => {
    const domain = DomainManager.getDomain(req.id);
    return domain;
  });

  registerHandler(DOMAIN_CHANNELS.UPDATE, async (_event, req) => {
    const domain = await DomainManager.updateDomain(req);
    return domain;
  });

  registerHandler(DOMAIN_CHANNELS.DELETE, async (_event, req) => {
    await DomainManager.deleteDomain(req.id);
  });

  registerHandler(DOMAIN_CHANNELS.GET_CONFIG, async (_event, req) => {
    const result = await DomainManager.getDomainConfig(req.id);
    return { config: result };
  });

  registerHandler(DOMAIN_CHANNELS.UPDATE_CONFIG, async (_event, req) => {
    const result = await DomainManager.updateDomainConfig(req.id, req.config);
    // Re-register domain skills after config update
    try {
      const db = getDatabaseService();
      const domainRow = db.domains.findById(req.id);
      if (domainRow) {
        const slug = domainRow.config_path.split("/").filter(Boolean).pop() ?? "";
        if (slug) await SkillEngine.registerDomainSkills(req.id, slug);
      }
    } catch { /* non-critical */ }
    return { config: result };
  });
}
