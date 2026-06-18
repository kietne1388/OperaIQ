import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (title: string, message: string, type?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (title: string, message: string, type?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => dismiss(id), 8000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const ctx = useContext(ToastContext)!;
  return (
    <div className="toast-container">
      {ctx.toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => ctx.dismiss(t.id)}>
          <div className="toast-title">
            <i className="bi bi-bell-fill" style={{ color: 'var(--accent)' }} />
            {t.title}
          </div>
          <div className="toast-body">{t.message}</div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}
