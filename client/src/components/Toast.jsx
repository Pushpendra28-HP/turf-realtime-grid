import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const toast = useCallback((message, kind = 'error') => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur ${
              t.kind === 'error'
                ? 'border-rose-500/30 bg-rose-950/80 text-rose-100'
                : 'border-line bg-raised/90 text-slate-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${t.kind === 'error' ? 'bg-rose-400' : 'bg-sky-400'}`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
