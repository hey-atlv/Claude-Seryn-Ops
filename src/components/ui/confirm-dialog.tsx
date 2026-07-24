"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

// Hộp thoại xác nhận in-app thay cho window.confirm().
// Lý do: window.confirm bị chặn (trả về false ngay, không hiện hộp thoại) trong
// webview/khung xem nhúng — mọi nút Xóa im lặng không làm gì. Ngoài ra dialog
// native không theo được dark theme của app.

interface ConfirmState {
  message: string;
  detail?: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

export interface ConfirmOptions {
  detail?: string;
  confirmLabel?: string;
}

/**
 * Trả về [confirm, dialog]:
 * - `confirm(message, options?)` → Promise<boolean>, dùng thay window.confirm
 * - `dialog` → node cần render trong component (thường đặt cuối JSX)
 */
export function useConfirm(): [
  (message: string, options?: ConfirmOptions) => Promise<boolean>,
  ReactNode,
] {
  const [state, setState] = useState<ConfirmState | null>(null);
  // Giữ resolve của lần gọi đang mở để đóng bằng Esc/nền vẫn trả lời được
  const pending = useRef<ConfirmState | null>(null);

  const confirm = useCallback(
    (message: string, options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const next: ConfirmState = {
          message,
          detail: options?.detail,
          confirmLabel: options?.confirmLabel ?? "Xóa",
          resolve,
        };
        pending.current = next;
        setState(next);
      }),
    [],
  );

  const settle = useCallback((ok: boolean) => {
    pending.current?.resolve(ok);
    pending.current = null;
    setState(null);
  }, []);

  const dialog = state ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={state.message}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) settle(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") settle(false);
      }}
    >
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-hair bg-panel p-5 shadow-[var(--shadow-elevated)]">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-text">{state.message}</p>
          {state.detail && <p className="text-xs text-muted">{state.detail}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-md px-3 py-1.5 text-sm text-dim hover:bg-panel-3"
          >
            Hủy
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className="rounded-md bg-critical/15 px-4 py-1.5 text-sm font-medium text-critical hover:bg-critical/25"
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirm, dialog];
}
