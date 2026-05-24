"use client";

import { useSecurityStore } from "@/stores/security-store";
import { useEffect, useCallback } from "react";
import type { WriteOperation } from "@/lib/ipc/channels";

export function useSecurityGate() {
  const {
    pendingAudits,
    pendingCount,
    loading,
    fetchPendingAudits,
    resolveAudit,
    bulkResolve,
    approveAllLowRisk,
  } = useSecurityStore();

  const assessWrite = useCallback(
    async (operation: WriteOperation) => {
      return window.api.security.assessWrite({ operation });
    },
    [],
  );

  const generateDiff = useCallback(
    async (oldContent: string | null, newContent: string | null) => {
      return window.api.security.generateDiff({ oldContent, newContent });
    },
    [],
  );

  return {
    pendingAudits,
    pendingCount,
    loading,
    fetchPendingAudits,
    resolveAudit,
    bulkResolve,
    approveAllLowRisk,
    assessWrite,
    generateDiff,
  };
}

export function usePendingAuditPoller(intervalMs: number = 5000) {
  const fetchPendingAudits = useSecurityStore((s) => s.fetchPendingAudits);

  useEffect(() => {
    fetchPendingAudits();
    const id = setInterval(fetchPendingAudits, intervalMs);
    return () => clearInterval(id);
  }, [fetchPendingAudits, intervalMs]);
}
