/**
 * Timeline IPC Handler — wires timeline channels to the TimelineEngine service.
 */
import { TIMELINE_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  listPredictions,
  getPrediction,
  createPrediction,
  updatePrediction,
  verifyPrediction,
  deletePrediction,
  analyzeTrends,
  generatePredictions,
  getPredictionAccuracy,
  expireOverduePredictions,
  extractTimelineEvents,
} from "../../services/timeline-engine";

export function registerTimelineHandlers(): void {
  registerHandler(TIMELINE_CHANNELS.LIST_PREDICTIONS, async (_event, req) => {
    return listPredictions(req.domainId, { status: req.status, limit: req.limit, offset: req.offset });
  });

  registerHandler(TIMELINE_CHANNELS.GET_PREDICTION, async (_event, req) => {
    return getPrediction(req.id);
  });

  registerHandler(TIMELINE_CHANNELS.CREATE_PREDICTION, async (_event, req) => {
    return createPrediction(req);
  });

  registerHandler(TIMELINE_CHANNELS.UPDATE_PREDICTION, async (_event, req) => {
    return updatePrediction(req.id, req);
  });

  registerHandler(TIMELINE_CHANNELS.VERIFY_PREDICTION, async (_event, req) => {
    return verifyPrediction(req.id, req.status, req.actualOutcome);
  });

  registerHandler(TIMELINE_CHANNELS.DELETE_PREDICTION, async (_event, req) => {
    deletePrediction(req.id);
  });

  registerHandler(TIMELINE_CHANNELS.ANALYZE_TRENDS, async (_event, req) => {
    return analyzeTrends(req.domainId, req.period, req.modelId);
  });

  registerHandler(TIMELINE_CHANNELS.GENERATE_PREDICTIONS, async (_event, req) => {
    const predictions = await generatePredictions(req.domainId, req.modelId);
    return { predictions };
  });

  registerHandler(TIMELINE_CHANNELS.GET_ACCURACY, async (_event, req) => {
    return getPredictionAccuracy(req.domainId);
  });

  registerHandler(TIMELINE_CHANNELS.EXPIRE_OVERDUE, async () => {
    const expired = expireOverduePredictions();
    return { expired };
  });

  registerHandler(TIMELINE_CHANNELS.GET_EVENTS, async (_event, req) => {
    return extractTimelineEvents(req.domainId, { limit: req.limit, offset: req.offset });
  });
}
