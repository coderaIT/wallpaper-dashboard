"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return <button {...props} className={`btn ${variant} ${className}`.trim()} />;
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function PageHeader({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {hint ? <p>{hint}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return <div className="alert" role="alert">{children}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      <Button type="button" className="small" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</Button>
      <span className="mono">{page} / {totalPages}</span>
      <Button type="button" className="small" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>التالي</Button>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: "on" | "off" | "gold" | "" }) {
  return <span className={`badge ${tone}`.trim()}>{children}</span>;
}
