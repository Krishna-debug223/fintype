"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ToastContextValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 2600);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border border-accent/50 bg-surface px-4 py-3 text-sm text-foreground shadow-panel transition-opacity",
          message ? "opacity-100" : "opacity-0",
        )}
        role="status"
        data-focus-chrome
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
