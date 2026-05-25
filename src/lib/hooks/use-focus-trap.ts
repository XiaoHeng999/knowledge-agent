'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * Traps keyboard focus within a container element when active.
 * Tab wraps from last to first, Shift+Tab wraps from first to last.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Manages focus transfer: saves previous focus on activation,
 * restores it on deactivation. Moves focus into the container.
 */
export function useFocusTransfer(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const timer = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const firstFocusable = containerRef.current.querySelector<HTMLElement>(
          FOCUSABLE_SELECTOR,
        );
        firstFocusable?.focus({ preventScroll: true });
      });

      return () => {
        cancelAnimationFrame(timer);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus({ preventScroll: true });
          previousFocusRef.current = null;
        }
      };
    }
  }, [containerRef, isActive]);
}
