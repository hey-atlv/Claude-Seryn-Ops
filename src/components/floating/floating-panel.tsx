"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

// Khung cửa sổ nhỏ dùng chung cho các widget nổi (AI, ghi chú...).

interface FloatingPanelProps {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function FloatingPanel({ title, icon, onClose, children }: FloatingPanelProps) {
  return (
    <div className="flex h-[min(32rem,75vh)] w-[min(23rem,92vw)] flex-col overflow-hidden rounded-xl border border-hair bg-panel shadow-elevated">
      <div className="flex items-center gap-2 border-b border-hair-soft bg-panel-2 px-3 py-2">
        {icon}
        <span className="flex-1 truncate text-sm font-semibold text-text">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Đóng ${title}`}
          className="rounded-md p-1 text-muted hover:bg-panel-3 hover:text-text"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
