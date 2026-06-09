import type { DomainInfo, DomainConfig } from "./shared";

export const DOMAIN_CHANNELS = {
  CREATE: "domain:create",
  LIST: "domain:list",
  GET: "domain:get",
  UPDATE: "domain:update",
  DELETE: "domain:delete",
  GET_CONFIG: "domain:getConfig",
  UPDATE_CONFIG: "domain:updateConfig",
} as const;

export interface DomainCreateRequest {
  name: string;
  description: string;
  color: string;
  icon: string;
  template?: string;
}
export interface DomainUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}
export interface DomainListResponse {
  domains: DomainInfo[];
}
export interface DomainGetConfigResponse {
  config: DomainConfig;
}
export interface DomainUpdateConfigRequest {
  id: string;
  config: Partial<DomainConfig>;
}
