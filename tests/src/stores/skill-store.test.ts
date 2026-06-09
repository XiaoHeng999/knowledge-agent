import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSkillStore } from '@/stores/skill-store';
import { useAppStore } from '@/stores/app-store';

function mockWindowApi() {
  Object.defineProperty(window, 'api', {
    value: {
      skill: {
        list: vi.fn().mockResolvedValue({ items: [] }),
        cancel: vi.fn(),
        metrics: vi.fn(),
      },
    },
    writable: true,
  });
}

describe('useSkillStore — error handling', () => {
  beforeEach(() => {
    mockWindowApi();
    useAppStore.setState({ globalError: null });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cancelExecution logs warning and sets global error on failure', async () => {
    (window.api.skill.cancel as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IPC error'),
    );

    const result = await useSkillStore.getState().cancelExecution('exec-1');

    expect(result).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      '[SkillStore] Failed to cancel execution:', expect.any(Error),
    );
    expect(useAppStore.getState().globalError).toBe('Failed to cancel skill execution');
  });

  it('getMetrics logs warning and sets global error on failure', async () => {
    (window.api.skill.metrics as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IPC error'),
    );

    const result = await useSkillStore.getState().getMetrics('skill-1');

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      '[SkillStore] Failed to load metrics:', expect.any(Error),
    );
    expect(useAppStore.getState().globalError).toBe('Failed to load skill metrics');
  });
});
