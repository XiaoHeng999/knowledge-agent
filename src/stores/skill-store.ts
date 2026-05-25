import { create } from "zustand";
import type { SkillInfo, SkillExecution, SkillMetrics } from "../lib/ipc/channels";

interface SkillState {
  skills: SkillInfo[];
  loading: boolean;
  executing: boolean;
  error: string | null;
  currentExecution: SkillExecution | null;

  fetchSkills: (domainId?: string) => Promise<void>;
  getSkill: (id: string) => Promise<SkillInfo | null>;
  toggleSkill: (id: string, enabled: boolean) => Promise<void>;
  executeSkill: (skillId: string, domainId: string, input: string, modelId?: string) => Promise<SkillExecution | null>;
  cancelExecution: (executionId: string) => Promise<boolean>;
  getMetrics: (skillId: string) => Promise<SkillMetrics | null>;
  rateSkill: (skillId: string, rating: number) => Promise<void>;
  registerDomainSkills: (domainId: string, domainSlug: string) => Promise<number>;
  clearError: () => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  loading: false,
  executing: false,
  error: null,
  currentExecution: null,

  fetchSkills: async (domainId?: string) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.skill.list({ domainId });
      set({ skills: result.items, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch skills",
        loading: false,
      });
    }
  },

  getSkill: async (id: string) => {
    try {
      return await window.api.skill.get({ id });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to get skill" });
      return null;
    }
  },

  toggleSkill: async (id: string, enabled: boolean) => {
    try {
      await window.api.skill.toggle({ id, enabled });
      set((state) => ({
        skills: state.skills.map((s) =>
          s.id === id ? { ...s, isEnabled: enabled } : s,
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to toggle skill" });
    }
  },

  executeSkill: async (skillId, domainId, input, modelId) => {
    set({ executing: true, error: null, currentExecution: null });
    try {
      const result = await window.api.skill.execute({ skillId, domainId, input, modelId });
      set({ currentExecution: result, executing: false });

      // Refresh skills to update execution counts
      const listResult = await window.api.skill.list({ domainId });
      set({ skills: listResult.items });

      return result;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Skill execution failed",
        executing: false,
      });
      return null;
    }
  },

  cancelExecution: async (executionId: string) => {
    try {
      const result = await window.api.skill.cancel({ id: executionId });
      return result.cancelled;
    } catch {
      return false;
    }
  },

  getMetrics: async (skillId: string) => {
    try {
      return await window.api.skill.metrics({ skillId });
    } catch {
      return null;
    }
  },

  rateSkill: async (skillId: string, rating: number) => {
    try {
      await window.api.skill.rate({ skillId, rating });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to rate skill" });
    }
  },

  registerDomainSkills: async (domainId: string, domainSlug: string) => {
    try {
      const result = await window.api.skill.registerDomain({ domainId, domainSlug });
      return result.registered;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to register domain skills" });
      return 0;
    }
  },

  clearError: () => set({ error: null }),
}));
