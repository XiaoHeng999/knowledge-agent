import { create } from "zustand";
import type { PendingAudit } from "@/lib/ipc/channels";

interface SecurityState {
  pendingAudits: PendingAudit[];
  pendingCount: number;
  loading: boolean;
}

interface SecurityActions {
  fetchPendingAudits: () => Promise<void>;
  resolveAudit: (
    auditId: string,
    action: "approve" | "reject" | "edit_and_approve",
    editedContent?: string,
  ) => Promise<void>;
  bulkResolve: (
    auditIds: string[],
    action: "approve_all" | "reject_all",
  ) => Promise<void>;
  approveAllLowRisk: () => Promise<void>;
}

export const useSecurityStore = create<SecurityState & SecurityActions>()(
  (set, get) => ({
    pendingAudits: [],
    pendingCount: 0,
    loading: false,

    fetchPendingAudits: async () => {
      set({ loading: true });
      try {
        const result = await window.api.security.getPendingAudits();
        set({
          pendingAudits: result.audits,
          pendingCount: result.count,
          loading: false,
        });
      } catch {
        set({ loading: false });
      }
    },

    resolveAudit: async (auditId, action, editedContent) => {
      await window.api.security.resolveAudit({ auditId, action, editedContent });
      await get().fetchPendingAudits();
    },

    bulkResolve: async (auditIds, action) => {
      await window.api.security.bulkResolve({ auditIds, action });
      await get().fetchPendingAudits();
    },

    approveAllLowRisk: async () => {
      const { pendingAudits } = get();
      const lowRiskIds = pendingAudits
        .filter((a) => a.risk.level === "low")
        .map((a) => a.id);
      if (lowRiskIds.length > 0) {
        await get().bulkResolve(lowRiskIds, "approve_all");
      }
    },
  }),
);
