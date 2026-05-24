'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 6;

    const pos: CSSProperties = {};

    switch (position) {
      case 'top':
        pos.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        pos.top = triggerRect.top - tooltipRect.height - gap;
        break;
      case 'bottom':
        pos.left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        pos.top = triggerRect.bottom + gap;
        break;
      case 'left':
        pos.left = triggerRect.left - tooltipRect.width - gap;
        pos.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        pos.left = triggerRect.right + gap;
        pos.top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    setCoords(pos);
  }, [position]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible) {
      updatePosition();
    }
  }, [visible, updatePosition]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className="ui-tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          className={`ui-tooltip ui-tooltip--${position} ${className}`}
          style={coords}
          role="tooltip"
        >
          <span className="ui-tooltip__content">{content}</span>
        </div>
      )}
    </>
  );
}
