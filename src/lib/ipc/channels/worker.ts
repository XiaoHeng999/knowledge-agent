export const WORKER_CHANNELS = {
  SUBMIT_TASK: "worker:submitTask",
  CANCEL_TASK: "worker:cancelTask",
  GET_STATUS: "worker:getStatus",
} as const;

export interface WorkerSubmitTaskRequest {
  type: string;
  priority?: "high" | "normal" | "low";
  payload: unknown;
  timeout?: number;
}

export interface WorkerTaskStatus {
  taskId: string;
  status: "submitted" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message?: string;
}

export interface WorkerCancelTaskRequest {
  taskId: string;
}

export interface WorkerStatusResponse {
  pendingCount: number;
  isReady: boolean;
}
