import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('stores and retrieves values', () => {
    const cache = new LRUCache<string>();
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts oldest entry when exceeding maxSize', () => {
    const cache = new LRUCache<string>({ maxSize: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('expires entries based on TTL', () => {
    const cache = new LRUCache<string>({ ttlMs: 1000 });
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');

    vi.advanceTimersByTime(1001);
    expect(cache.get('a')).toBeUndefined();
  });

  it('delete removes an entry', () => {
    const cache = new LRUCache<string>();
    cache.set('a', 'hello');
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.delete('a')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new LRUCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
