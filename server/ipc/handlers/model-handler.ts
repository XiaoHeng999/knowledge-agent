/**
 * Model management IPC handlers — wires MODEL_CHANNELS to ModelManager service.
 */
import { MODEL_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as ModelManager from "../../services/model-manager";

export function registerModelHandlers(): void {
  registerHandler(MODEL_CHANNELS.LIST_PROVIDERS, async () => {
    const providers = await ModelManager.listProviders();
    return { providers };
  });

  registerHandler(MODEL_CHANNELS.LIST_MODELS, async (_event, req) => {
    const models = await ModelManager.listModels(req.providerId);
    return { models };
  });

  registerHandler(MODEL_CHANNELS.ADD_API_KEY, async (_event, req) => {
    const result = await ModelManager.addApiKey(req.providerId, req.apiKey);
    return { success: true, providerId: result.providerId };
  });

  registerHandler(MODEL_CHANNELS.VALIDATE_API_KEY, async (_event, req) => {
    const result = await ModelManager.validateApiKey(req.providerId, req.apiKey);
    return { valid: result.valid, models: result.models };
  });

  registerHandler(MODEL_CHANNELS.REMOVE_API_KEY, async (_event, req) => {
    ModelManager.removeApiKey(req.providerId);
  });

  registerHandler(MODEL_CHANNELS.SET_DEFAULT, async (_event, req) => {
    ModelManager.setDefaultModel(req);
  });

  registerHandler(MODEL_CHANNELS.GET_DEFAULT, async (_event, req) => {
    const result = ModelManager.getDefaultModel(req);
    if (!result) {
      return { providerId: "", modelId: "" };
    }
    return result;
  });
}
