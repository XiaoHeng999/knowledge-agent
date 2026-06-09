import { app } from "electron";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Structured Logger — JSON format, log levels, operation cost tracking
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  durationMs?: number;
  costUsd?: number;
  tokensUsed?: number;
  error?: string;
  data?: Record<string, unknown>;
}

interface LoggerConfig {
  level: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  level: "info",
  logToFile: true,
  logToConsole: true,
};

class LoggerService {
  private config: LoggerConfig;
  private logStream: fs.WriteStream | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(): void {
    if (!this.config.logToFile) return;

    try {
      const userDataPath = app.getPath("userData");
      const logDir = path.join(userDataPath, "logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const date = new Date().toISOString().split("T")[0];
      const logFile = path.join(logDir, `agentclaw-${date}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: "a" });
    } catch {
      // Fallback to console-only if file logging fails
      this.config.logToFile = false;
    }
  }

  shutdown(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  debug(module: string, message: string, data?: Record<string, unknown>): void {
    this.write("debug", module, message, data);
  }

  info(module: string, message: string, data?: Record<string, unknown>): void {
    this.write("info", module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, unknown>): void {
    this.write("warn", module, message, data);
  }

  error(module: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.write("error", module, message, {
      ...data,
      error: error?.message,
      stack: error?.stack,
    });
  }

  /** Log an operation with timing and optional cost tracking */
  operation(
    module: string,
    operation: string,
    fn: () => Promise<void>,
    options?: {
      costUsd?: number;
      tokensUsed?: number;
    },
  ): Promise<void> {
    const start = performance.now();
    return fn().then(
      () => {
        const durationMs = Math.round(performance.now() - start);
        this.write("info", module, operation, {
          durationMs,
          costUsd: options?.costUsd,
          tokensUsed: options?.tokensUsed,
        });
      },
      (err) => {
        const durationMs = Math.round(performance.now() - start);
        this.write("error", module, `${operation} failed`, {
          durationMs,
          costUsd: options?.costUsd,
          tokensUsed: options?.tokensUsed,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      },
    );
  }

  private write(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.level]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...data,
    };

    const json = JSON.stringify(entry);

    if (this.config.logToConsole) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`;
      const consoleFn = level === "error" ? console.error
        : level === "warn" ? console.warn
        : console.log;
      consoleFn(`${prefix} ${message}`, data ?? "");
    }

    if (this.logStream) {
      this.logStream.write(json + "\n");
    }
  }
}

// Singleton instance
export const logger = new LoggerService();

/** Create a module-scoped logger that delegates to the singleton */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => logger.debug(module, message, data),
    info: (message: string, data?: Record<string, unknown>) => logger.info(module, message, data),
    warn: (message: string, data?: Record<string, unknown>) => logger.warn(module, message, data),
    error: (message: string, error?: Error, data?: Record<string, unknown>) => logger.error(module, message, error, data),
  };
}
