"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastTone = "ok" | "err";
type ToastValue = { push: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((message: string, tone: ToastTone = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toast ? <div className={`toast ${toast.tone}`}>{toast.message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

type ConfirmOptions = { title: string; body: string; confirmText?: string; danger?: boolean };
type ConfirmValue = { ask: (options: ConfirmOptions) => Promise<boolean> };

const ConfirmContext = createContext<ConfirmValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  function close(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={{ ask }}>
      {children}
      {options ? (
        <div className="modal-back" onMouseDown={() => close(false)}>
          <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2>{options.title}</h2>
            </header>
            <p className="muted" style={{ marginTop: 0 }}>{options.body}</p>
            <div className="page-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => close(false)}>تراجع</button>
              <button type="button" className={`btn ${options.danger ? "danger" : "primary"}`} onClick={() => close(true)}>
                {options.confirmText ?? "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
