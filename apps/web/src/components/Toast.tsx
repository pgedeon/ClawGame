import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'> | string, type?: Toast['type']) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'> | string, type: Toast['type'] = 'info') => {
    const toastData = typeof toast === 'string' ? { message: toast, type } : toast;
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toastData, id }]);

    // Auto-dismiss after duration (default 3s)
    const duration = toastData.duration ?? 3000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastList() {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts } = context;
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
