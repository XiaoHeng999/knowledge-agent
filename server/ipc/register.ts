import { APP_CHANNELS, DB_CHANNELS, WINDOW_CHANNELS } from "../../src/lib/ipc/channels";
import { BrowserWindow } from "electron";
import { registerHandler } from "./handler";
import { registerRoutes, createServiceRegistry, type ServiceRegistry } from "./router";
import { getAutoRoutes } from "./routes";
import {
  initializeDatabase,
  getDatabaseService,
  backupDatabase,
} from "../db/index";
import { loadMigrations } from "../db/migrations/index";
import { getWorkerBridge } from "../worker/worker-bridge";
import {
  getUpdateStatus,
  downloadUpdate,
  quitAndInstall,
} from "../services/auto-updater";
import { createSkillEngine, type SkillEngine } from "../services/skill-engine";
import { createFrameworkEngine, type FrameworkEngine } from "../services/framework-engine";
import { createTimelineEngine, type TimelineEngine } from "../services/timeline-engine";
import { createResearchScheduler, type ResearchScheduler } from "../services/research-scheduler";
import { createConversationService, type ConversationService } from "../services/conversation-service";
import { createModelManager, type ModelManager } from "../services/model-manager";
import { getPiMonoWrapper } from "../pi-mono/instance";
import { registerDomainHandlers as registerDomainExplicitHandlers } from "./handlers/domain-handler";
import { registerInboxHandlers as registerInboxExplicitHandlers } from "./handlers/inbox-handler";
import { registerSecurityHandlers as registerSecurityExplicitHandlers } from "./handlers/security-handler";
import { registerKnowledgeHandlers as registerKnowledgeExplicitHandlers } from "./handlers/knowledge-handler";
import { registerChatHandlers as registerChatExplicitHandlers } from "./handlers/chat-handler";

// ---------------------------------------------------------------------------
// Service registry — maps service names to service objects for auto-routes
// ---------------------------------------------------------------------------

function buildServiceRegistry(): ServiceRegistry {
  const registry = createServiceRegistry();

  const db = getDatabaseService();
  const skillEngine = createSkillEngine({ db });
  const frameworkEngine = createFrameworkEngine({ db });
  const timelineEngine = createTimelineEngine({ db });
  const researchScheduler = createResearchScheduler({ db, piMono: getPiMonoWrapper() });
  const conversationService = createConversationService({ db, piMono: getPiMonoWrapper() });
  const modelManager = createModelManager({ db, piMono: getPiMonoWrapper() });

  registry.set("version-control", require("../services/version-control"));
  registry.set("search-engine", require("../services/search-engine"));
  registry.set("research-scheduler", researchScheduler);
  registry.set("import-pipeline", require("../services/import-pipeline"));
  registry.set("timeline-engine", timelineEngine);
  registry.set("skill-engine", skillEngine);
  registry.set("model-manager", modelManager);
  registry.set("inbox-processor", require("../services/inbox-processor"));
  registry.set("framework-engine", frameworkEngine);
  registry.set("decision-service", require("../services/decision-service"));
  registry.set("domain-summary-service", require("../services/domain-summary-service"));
  registry.set("domain-manager", require("../services/domain-manager"));
  registry.set("security-gate", require("../services/security-gate"));
  registry.set("diff-service", require("../services/diff-service"));
  registry.set("conversation-service", conversationService);
  registry.set("knowledge-graph", require("../services/knowledge-graph"));

  // Inline service adapters
  registry.set("db-settings", getDatabaseService().settings);
  registry.set("auto-updater", {
    getUpdateStatus,
    downloadUpdate,
    quitAndInstall,
  });
  registry.set("worker-bridge", getWorkerBridge());

  return registry;
}

// ---------------------------------------------------------------------------
// App handlers (inline — simple, no service)
// ---------------------------------------------------------------------------

function registerAppHandlers(): void {
  registerHandler(APP_CHANNELS.PING, async () => ({ message: "pong" }));

  registerHandler(APP_CHANNELS.GET_VERSION, async () => {
    const { app } = await import("electron");
    return { version: app.getVersion() };
  });

  registerHandler(APP_CHANNELS.GET_PLATFORM, async () => {
    return { platform: process.platform };
  });
}

// ---------------------------------------------------------------------------
// DB handlers (inline — lifecycle management)
// ---------------------------------------------------------------------------

function registerDbHandlers(): void {
  registerHandler(DB_CHANNELS.INITIALIZE, async (_event, req) => {
    const svc = initializeDatabase(req.dbPath);
    const version = svc.migrations.getCurrentVersion();
    return { success: true, version };
  });

  registerHandler(DB_CHANNELS.MIGRATE, async () => {
    const svc = getDatabaseService();
    const fromVersion = svc.migrations.getCurrentVersion();
    const result = svc.migrations.run(loadMigrations());
    return { success: true, fromVersion, toVersion: result.currentVersion };
  });

  registerHandler(DB_CHANNELS.GET_VERSION, async () => {
    const svc = getDatabaseService();
    return { version: svc.migrations.getCurrentVersion() };
  });

  registerHandler(DB_CHANNELS.BACKUP, async (_event, req) => {
    backupDatabase(req.targetPath);
    return { success: true, path: req.targetPath };
  });
}

// ---------------------------------------------------------------------------
// Window handlers (inline — BrowserWindow operations)
// ---------------------------------------------------------------------------

function registerWindowHandlers(): void {
  registerHandler(WINDOW_CHANNELS.MINIMIZE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.MAXIMIZE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.maximize();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.CLOSE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.IS_MAXIMIZED, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return { maximized: win?.isMaximized() ?? false };
  });

  registerHandler(WINDOW_CHANNELS.TOGGLE_MAXIMIZE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: true };
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return { success: true };
  });
}

// ===========================================================================
// Public entry point — called once from electron/main.ts
// ===========================================================================

export function registerAllIpcHandlers(): void {
  // 1. Auto-routes — declarative service dispatch for passthrough channels
  const registry = buildServiceRegistry();
  const skillEngine = registry.get("skill-engine") as SkillEngine;
  const timelineEngine = registry.get("timeline-engine") as TimelineEngine;
  const conversationService = registry.get("conversation-service") as ConversationService;
  registerRoutes(getAutoRoutes(), registry);

  // 2. Service initialization
  timelineEngine.initializeTimelineExecutor();

  // 3. Explicit handlers — channels with orchestration logic
  registerAppHandlers();
  registerDbHandlers();
  registerDomainExplicitHandlers(skillEngine);
  registerInboxExplicitHandlers();
  registerSecurityExplicitHandlers();
  registerKnowledgeExplicitHandlers();
  registerChatExplicitHandlers(conversationService);
  registerWindowHandlers();
}
