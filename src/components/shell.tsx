"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/format";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/wallpapers", label: "الخلفيات" },
  { href: "/categories", label: "التصنيفات" },
  { href: "/banners", label: "البانرات" },
  { href: "/home-sections", label: "أقسام الرئيسية" },
  { href: "/media", label: "الوسائط" },
  { href: "/analytics", label: "التحليلات" },
  { href: "/settings", label: "الإعدادات" },
];

const superLinks = [
  { href: "/admins", label: "المدراء" },
  { href: "/audit", label: "سجل التدقيق" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = admin?.role === "SUPER_ADMIN" ? [...links, ...superLinks] : links;

  return (
    <div className="shell">
      {open ? <button type="button" className="scrim" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} /> : null}
      <aside className={`side ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">و</div>
          <div>
            <strong>استوديو الخلفيات</strong>
            <span>لوحة الإدارة</span>
          </div>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <strong>{admin?.name}</strong>
            <span>{admin ? roleLabel(admin.role) : ""}</span>
          </div>
          <Link href="/account" className={isActive(pathname, "/account") ? "active" : ""} onClick={() => setOpen(false)}>
            الحساب
          </Link>
          <button type="button" className="navish" onClick={() => void logout()}>تسجيل الخروج</button>
        </div>
      </aside>
      <div className="main">
        <div className="top">
          <button type="button" className="menu-btn btn small" onClick={() => setOpen(true)}>القائمة</button>
          <strong>استوديو الخلفيات</strong>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
