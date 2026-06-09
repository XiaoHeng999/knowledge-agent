import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/stores/app-store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      globalError: null,
    });
  });

  it('exposes globalError state starting as null', () => {
    expect(useAppStore.getState().globalError).toBeNull();
  });

  it('setGlobalError sets an error message', () => {
    useAppStore.getState().setGlobalError('Something broke');
    expect(useAppStore.getState().globalError).toBe('Something broke');
  });

  it('setGlobalError(null) clears the error', () => {
    useAppStore.getState().setGlobalError('err');
    useAppStore.getState().setGlobalError(null);
    expect(useAppStore.getState().globalError).toBeNull();
  });
});
