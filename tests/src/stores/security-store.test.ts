import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSecurityStore } from '@/stores/security-store';
import { useAppStore } from '@/stores/app-store';

function mockWindowApi() {
  Object.defineProperty(window, 'api', {
    value: {
      security: {
        getPendingAudits: vi.fn(),
        resolveAudit: vi.fn(),
        bulkResolve: vi.fn(),
      },
    },
    writable: true,
  });
}

describe('useSecurityStore — error handling', () => {
  beforeEach(() => {
    mockWindowApi();
    useAppStore.setState({ globalError: null });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPendingAudits logs warning and sets global error on failure', async () => {
    (window.api.security.getPendingAudits as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IPC down'),
    );

    await useSecurityStore.getState().fetchPendingAudits();

    expect(console.warn).toHaveBeenCalledWith(
      '[SecurityStore] Failed to load:', expect.any(Error),
    );
    expect(useAppStore.getState().globalError).toBe('Failed to fetch pending audits');
  });
});
