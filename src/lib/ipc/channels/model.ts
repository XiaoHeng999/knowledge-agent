import type { ProviderInfo, ModelInfo } from "./shared";

export const MODEL_CHANNELS = {
  LIST_PROVIDERS: "model:listProviders",
  LIST_MODELS: "model:listModels",
  ADD_API_KEY: "model:addApiKey",
  VALIDATE_API_KEY: "model:validateApiKey",
  REMOVE_API_KEY: "model:removeApiKey",
  SET_DEFAULT: "model:setDefault",
  GET_DEFAULT: "model:getDefault",
} as const;

export interface ModelListProvidersResponse {
  providers: ProviderInfo[];
}
export interface ModelListModelsRequest {
  providerId?: string;
}
export interface ModelListModelsResponse {
  models: ModelInfo[];
}
export interface ModelAddApiKeyRequest {
  providerId: string;
  apiKey: string;
}
export interface ModelAddApiKeyResponse {
  success: boolean;
  providerId: string;
}
export interface ModelValidateApiKeyRequest {
  providerId: string;
  apiKey: string;
}
export interface ModelValidateApiKeyResponse {
  valid: boolean;
  models: ModelInfo[];
}
export interface ModelRemoveApiKeyRequest {
  providerId: string;
}
export interface ModelSetDefaultRequest {
  providerId: string;
  modelId: string;
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}
export interface ModelGetDefaultRequest {
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}
export interface ModelGetDefaultResponse {
  providerId: string;
  modelId: string;
}
