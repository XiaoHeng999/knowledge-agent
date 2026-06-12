'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // 挂载后才渲染 portal，避免 hydration mismatch
  useEffect(() => {
    setPortalTarget(document.getElementById('toast-portal'));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ addToast, removeToast }}>
      {children}
      {portalTarget &&
        createPortal(
          <ToastContainer toasts={toasts} onRemove={removeToast} />,
          portalTarget,
        )}
    </ToastContext>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="ui-toast-container" aria-label="Notifications" role="region">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, duration, onRemove]);

  const iconMap: Record<ToastType, string> = {
    success:
      'M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z',
    error:
      'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 5.354a.5.5 0 1 0-.708.708L7.293 8.5l-2.647 2.646a.5.5 0 0 0 .708.708L8 9.207l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8.5l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.793 5.354 5.146z',
    warning:
      'M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.16.16 0 0 1-.054.06.18.18 0 0 1-.065.017H1.141a.18.18 0 0 1-.065-.017.16.16 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z',
    info: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.064-.474 0-.587-.1-.158-.272-.2-.503-.2l.135-.416c.516-.086 1.003-.152 1.501-.152.293 0 .512.06.634.2.122.14.122.348.006.634zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z',
  };

  return (
    <div
      className={`ui-toast ui-toast--${toast.type}`}
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="ui-toast__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d={iconMap[toast.type]} />
        </svg>
      </span>
      <span className="ui-toast__message">{toast.message}</span>
      {toast.action && (
        <button
          className="ui-toast__action"
          onClick={toast.action.onClick}
          aria-label={toast.action.label}
          type="button"
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="ui-toast__close"
        onClick={() => onRemove(toast.id)}
        aria-label={`Dismiss ${toast.type} notification`}
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  );
}
