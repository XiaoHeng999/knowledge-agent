import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName, ChannelRequest, ChannelResponse } from "../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Type-safe invoke wrapper
// ---------------------------------------------------------------------------

function invoke<C extends ChannelName>(
  channel: C,
  ...args: ChannelRequest<C> extends void ? [] : [ChannelRequest<C>]
): Promise<ChannelResponse<C>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<ChannelResponse<C>>;
}

// ---------------------------------------------------------------------------
// Public API exposed to the renderer via contextBridge
// ---------------------------------------------------------------------------

const api = {
  // --- App ---
  app: {
    ping: () => invoke("app:ping"),
    getVersion: () => invoke("app:getVersion"),
    getPlatform: () => invoke("app:getPlatform"),
  },

  // --- Database ---
  db: {
    initialize: (req: ChannelRequest<"db:initialize">) => invoke("db:initialize", req),
    migrate: () => invoke("db:migrate"),
    getVersion: () => invoke("db:getVersion"),
    backup: (req: ChannelRequest<"db:backup">) => invoke("db:backup", req),
  },

  // --- Models ---
  model: {
    listProviders: () => invoke("model:listProviders"),
    listModels: (req: ChannelRequest<"model:listModels"> = {}) => invoke("model:listModels", req),
    addApiKey: (req: ChannelRequest<"model:addApiKey">) => invoke("model:addApiKey", req),
    validateApiKey: (req: ChannelRequest<"model:validateApiKey">) => invoke("model:validateApiKey", req),
    removeApiKey: (req: ChannelRequest<"model:removeApiKey">) => invoke("model:removeApiKey", req),
    setDefault: (req: ChannelRequest<"model:setDefault">) => invoke("model:setDefault", req),
    getDefault: (req: ChannelRequest<"model:getDefault">) => invoke("model:getDefault", req),
  },

  // --- Domains ---
  domain: {
    create: (req: ChannelRequest<"domain:create">) => invoke("domain:create", req),
    list: () => invoke("domain:list"),
    get: (req: ChannelRequest<"domain:get">) => invoke("domain:get", req),
    update: (req: ChannelRequest<"domain:update">) => invoke("domain:update", req),
    delete: (req: ChannelRequest<"domain:delete">) => invoke("domain:delete", req),
    getConfig: (req: ChannelRequest<"domain:getConfig">) => invoke("domain:getConfig", req),
    updateConfig: (req: ChannelRequest<"domain:updateConfig">) => invoke("domain:updateConfig", req),
  },

  // --- Knowledge ---
  knowledge: {
    createNode: (req: ChannelRequest<"knowledge:createNode">) => invoke("knowledge:createNode", req),
    updateNode: (req: ChannelRequest<"knowledge:updateNode">) => invoke("knowledge:updateNode", req),
    deleteNode: (req: ChannelRequest<"knowledge:deleteNode">) => invoke("knowledge:deleteNode", req),
    getNode: (req: ChannelRequest<"knowledge:getNode">) => invoke("knowledge:getNode", req),
    listNodes: (req: ChannelRequest<"knowledge:listNodes">) => invoke("knowledge:listNodes", req),
    createEdge: (req: ChannelRequest<"knowledge:createEdge">) => invoke("knowledge:createEdge", req),
    deleteEdge: (req: ChannelRequest<"knowledge:deleteEdge">) => invoke("knowledge:deleteEdge", req),
    getGraph: (req: ChannelRequest<"knowledge:getGraph">) => invoke("knowledge:getGraph", req),
    search: (req: ChannelRequest<"knowledge:search">) => invoke("knowledge:search", req),
  },

  // --- Inbox ---
  inbox: {
    addItem: (req: ChannelRequest<"inbox:addItem">) => invoke("inbox:addItem", req),
    listItems: (req: ChannelRequest<"inbox:listItems"> = {}) => invoke("inbox:listItems", req),
    processItem: (req: ChannelRequest<"inbox:processItem">) => invoke("inbox:processItem", req),
    rejectItem: (req: ChannelRequest<"inbox:rejectItem">) => invoke("inbox:rejectItem", req),
    getStats: () => invoke("inbox:getStats"),
    suggestDomains: (req: ChannelRequest<"inbox:suggestDomains">) => invoke("inbox:suggestDomains", req),
  },

  // --- Research ---
  research: {
    trigger: (req: ChannelRequest<"research:trigger">) => invoke("research:trigger", req),
    getStatus: (req: ChannelRequest<"research:getStatus">) => invoke("research:getStatus", req),
    listHistory: (req: ChannelRequest<"research:listHistory">) => invoke("research:listHistory", req),
    getDashboard: () => invoke("research:getDashboard"),
    cancel: (req: ChannelRequest<"research:cancel">) => invoke("research:cancel", req),
  },

  // --- Settings ---
  settings: {
    get: (req: ChannelRequest<"settings:get">) => invoke("settings:get", req),
    set: (req: ChannelRequest<"settings:set">) => invoke("settings:set", req),
    getTheme: () => invoke("settings:getTheme"),
    setTheme: (req: ChannelRequest<"settings:setTheme">) => invoke("settings:setTheme", req),
  },

  // --- Import ---
  import: {
    importUrl: (req: ChannelRequest<"import:importUrl">) => invoke("import:importUrl", req),
    importFile: (req: ChannelRequest<"import:importFile">) => invoke("import:importFile", req),
    getStatus: (req: ChannelRequest<"import:getStatus">) => invoke("import:getStatus", req),
  },

  // --- Window ---
  window: {
    minimize: () => invoke("window:minimize"),
    maximize: () => invoke("window:maximize"),
    close: () => invoke("window:close"),
    isMaximized: () => invoke("window:isMaximized"),
    toggleMaximize: () => invoke("window:toggleMaximize"),
  },

  // --- Version Control ---
  vc: {
    init: () => invoke("vc:init"),
    getStatus: () => invoke("vc:getStatus"),
    getHistory: (req: ChannelRequest<"vc:getHistory">) => invoke("vc:getHistory", req),
    getDiff: (req: ChannelRequest<"vc:getDiff">) => invoke("vc:getDiff", req),
    rollback: (req: ChannelRequest<"vc:rollback">) => invoke("vc:rollback", req),
  },

  // --- Security ---
  security: {
    assessWrite: (req: ChannelRequest<"security:assessWrite">) => invoke("security:assessWrite", req),
    getPendingAudits: () => invoke("security:getPendingAudits"),
    resolveAudit: (req: ChannelRequest<"security:resolveAudit">) => invoke("security:resolveAudit", req),
    bulkResolve: (req: ChannelRequest<"security:bulkResolve">) => invoke("security:bulkResolve", req),
    getAuditLog: (req: ChannelRequest<"security:getAuditLog"> = {}) => invoke("security:getAuditLog", req),
    generateDiff: (req: ChannelRequest<"security:generateDiff">) => invoke("security:generateDiff", req),
  },

  // --- Chat ---
  chat: {
    createConversation: (req: ChannelRequest<"chat:createConversation">) => invoke("chat:createConversation", req),
    listConversations: (req: ChannelRequest<"chat:listConversations">) => invoke("chat:listConversations", req),
    getConversation: (req: ChannelRequest<"chat:getConversation">) => invoke("chat:getConversation", req),
    deleteConversation: (req: ChannelRequest<"chat:deleteConversation">) => invoke("chat:deleteConversation", req),
    getTree: (req: ChannelRequest<"chat:getTree">) => invoke("chat:getTree", req),
    sendMessage: (req: ChannelRequest<"chat:sendMessage">) => invoke("chat:sendMessage", req),
    abortStream: (req: ChannelRequest<"chat:abortStream">) => invoke("chat:abortStream", req),
    addMessage: (req: ChannelRequest<"chat:addMessage">) => invoke("chat:addMessage", req),
    branchFromMessage: (req: ChannelRequest<"chat:branchFromMessage">) => invoke("chat:branchFromMessage", req),
  },

  // --- Search ---
  search: {
    search: (req: ChannelRequest<"search:search">) => invoke("search:search", req),
    reindexDomain: (req: ChannelRequest<"search:reindexDomain">) => invoke("search:reindexDomain", req),
  },

  // --- Event subscription (main → renderer pushes) ---
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld("api", api);
