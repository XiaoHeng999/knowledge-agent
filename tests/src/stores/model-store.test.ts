import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useModelStore } from '@/stores/model-store';

function mockWindowApi() {
  Object.defineProperty(window, 'api', {
    value: {
      model: {
        listProviders: vi.fn().mockResolvedValue({ providers: [] }),
        getDefault: vi.fn(),
      },
    },
    writable: true,
  });
}

describe('useModelStore — error handling', () => {
  beforeEach(() => {
    mockWindowApi();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchDefaultModel logs warning on failure (optional operation)', async () => {
    (window.api.model.getDefault as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IPC error'),
    );

    await useModelStore.getState().fetchDefaultModel('global');

    expect(console.warn).toHaveBeenCalledWith(
      '[ModelStore] Failed to load default model:', expect.any(Error),
    );
    // Should NOT set globalError — default is optional
    expect(useModelStore.getState().error).toBeNull();
  });
});
