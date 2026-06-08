/**
 * Session context registry — maps active agent sessions to their domain IDs.
 * Used by extension hooks to inject domain-specific context and enforce security policies.
 *
 * Flow:
 * 1. PiMonoWrapper calls setPendingDomain(domainId) before createAgentSession()
 * 2. session_start hook calls consumePendingDomain() to capture the domainId
 * 3. PiMonoWrapper calls registerSession(sessionId, domainId) after creation
 * 4. Other hooks (before_agent_start, tool_call) call getDomainContext(sessionId)
 * 5. PiMonoWrapper.destroySession() calls clearSession(sessionId)
 */
import { getDatabaseService } from "../../db/index";

const sessionDomainMap = new Map<string, string>();
let pendingDomainId: string | null = null;

export function setPendingDomain(domainId: string): void {
  pendingDomainId = domainId;
}

export function consumePendingDomain(): string | undefined {
  const id = pendingDomainId;
  pendingDomainId = null;
  return id ?? undefined;
}

export function registerSession(sessionId: string, domainId: string): void {
  sessionDomainMap.set(sessionId, domainId);
}

export function getSessionDomain(sessionId: string): string | undefined {
  return sessionDomainMap.get(sessionId);
}

export function clearSession(sessionId: string): void {
  sessionDomainMap.delete(sessionId);
}

export interface DomainContext {
  domainId: string;
  name: string;
  description: string | null;
  knowledgeNodeCount: number;
}

export function getDomainContext(sessionId: string): DomainContext | null {
  const domainId = sessionDomainMap.get(sessionId);
  if (!domainId) return null;

  const db = getDatabaseService();
  const domain = db.domains.findById(domainId);
  if (!domain) return null;

  const nodes = db.knowledgeNodes.listByDomain({ domainId, limit: 1, offset: 0 });

  return {
    domainId,
    name: domain.name,
    description: domain.description,
    knowledgeNodeCount: nodes.total,
  };
}
