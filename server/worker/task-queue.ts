/**
 * Priority task queue — HIGH > NORMAL > LOW, FIFO within priority.
 * Sequential execution (1 task at a time), max 100 pending tasks.
 */
import type { WorkerTaskPayload, TaskPriority, WorkerToMainMessage } from "./types";

const MAX_QUEUE_DEPTH = 100;
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

export class TaskQueue {
  private queues: Record<TaskPriority, WorkerTaskPayload[]> = {
    high: [],
    normal: [],
    low: [],
  };

  private activeTask: WorkerTaskPayload | null = null;
  private paused = false;

  get pendingCount(): number {
    return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
  }

  get currentActiveTask(): WorkerTaskPayload | null {
    return this.activeTask;
  }

  enqueue(task: WorkerTaskPayload): boolean {
    if (this.pendingCount >= MAX_QUEUE_DEPTH) {
      // Drop oldest low-priority task to make room
      if (task.priority === "low") return false;
      const dropped = this.queues.low.shift();
      if (!dropped) return false;
    }

    this.queues[task.priority].push(task);
    return true;
  }

  dequeue(): WorkerTaskPayload | null {
    if (this.paused) return null;

    // Select highest priority queue that has items (FIFO within)
    for (const prio of ["high", "normal", "low"] as TaskPriority[]) {
      if (this.queues[prio].length > 0) {
        const task = this.queues[prio].shift()!;
        this.activeTask = task;
        return task;
      }
    }
    return null;
  }

  completeActive(): void {
    this.activeTask = null;
  }

  cancelActive(): WorkerTaskPayload | null {
    const task = this.activeTask;
    this.activeTask = null;
    return task;
  }

  cancelById(taskId: string): WorkerTaskPayload | null {
    // Check active task
    if (this.activeTask?.id === taskId) {
      return this.cancelActive();
    }

    // Search queues
    for (const prio of ["high", "normal", "low"] as TaskPriority[]) {
      const idx = this.queues[prio].findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        return this.queues[prio].splice(idx, 1)[0];
      }
    }
    return null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  clear(): void {
    this.queues.high = [];
    this.queues.normal = [];
    this.queues.low = [];
    this.activeTask = null;
  }
}

// ---------------------------------------------------------------------------
// Rate-limited progress reporter
// ---------------------------------------------------------------------------

export function createProgressReporter(
  taskId: string,
  sendFn: (msg: WorkerToMainMessage) => void,
  minIntervalMs = 1000,
): (progress: number, message?: string) => void {
  let lastSent = 0;

  return (progress: number, message?: string) => {
    const now = Date.now();
    if (now - lastSent < minIntervalMs && progress < 1.0) return;

    lastSent = now;
    sendFn({
      type: "TASK_PROGRESS",
      taskId,
      progress: Math.min(progress, 1.0),
      message,
    });
  };
}

/** Compute a suitable progress interval based on estimated task duration. */
export function getProgressInterval(estimatedDurationMs: number): number {
  if (estimatedDurationMs < 5000) return Infinity; // no reports
  if (estimatedDurationMs < 30000) return 1000;
  if (estimatedDurationMs < 120000) return 2000;
  return 5000;
}
