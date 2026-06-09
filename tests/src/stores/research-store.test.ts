import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useResearchStore } from '@/stores/research-store';

function mockWindowApi() {
  Object.defineProperty(window, 'api', {
    value: {
      research: {
        getStatus: vi.fn(),
      },
    },
    writable: true,
  });
}

describe('useResearchStore — error handling', () => {
  beforeEach(() => {
    mockWindowApi();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshStatus logs warning on failure (run may be cleaned up)', async () => {
    (window.api.research.getStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IPC error'),
    );

    await useResearchStore.getState().refreshStatus('run-1');

    expect(console.warn).toHaveBeenCalledWith(
      '[ResearchStore] Failed to refresh status:', expect.any(Error),
    );
  });
});
