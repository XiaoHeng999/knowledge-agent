'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Moves focus to the main content heading on route changes,
 * enabling keyboard users to follow navigation.
 */
export function useRouteFocus(): void {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;

    const heading = main.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: false });
    }
  }, [pathname]);
}
