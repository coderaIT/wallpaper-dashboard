"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/locale-tabs";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { MessageKey, useI18n } from "@/lib/i18n";

const links: { href: string; label: MessageKey }[] = [
  { href: "/", label: "nav.home" },
  { href: "/wallpapers", label: "nav.wallpapers" },
  { href: "/categories", label: "nav.categories" },
  { href: "/banners", label: "nav.banners" },
  { href: "/home-sections", label: "nav.sections" },
  { href: "/media", label: "nav.media" },
  { href: "/analytics", label: "nav.analytics" },
  { href: "/settings", label: "nav.settings" },
];

const superLinks: { href: string; label: MessageKey }[] = [
  { href: "/admins", label: "nav.admins" },
  { href: "/audit", label: "nav.audit" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const items = admin?.role === "SUPER_ADMIN" ? [...links, ...superLinks] : links;

  return (
    <div className="shell">
      {open ? <button type="button" className="scrim" aria-label={t("nav.close")} onClick={() => setOpen(false)} /> : null}
      <aside className={`side ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">و</div>
          <div>
            <strong>{t("app.name")}</strong>
            <span>{t("app.admin")}</span>
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
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <LanguageSwitcher />
          <div className="who">
            <strong>{admin?.name}</strong>
            <span>{admin ? roleLabel(admin.role) : ""}</span>
          </div>
          <Link href="/account" className={isActive(pathname, "/account") ? "active" : ""} onClick={() => setOpen(false)}>
            {t("nav.account")}
          </Link>
          <button type="button" className="navish" onClick={() => void logout()}>{t("nav.logout")}</button>
        </div>
      </aside>
      <div className="main">
        <div className="top">
          <button type="button" className="menu-btn btn small" onClick={() => setOpen(true)}>{t("nav.menu")}</button>
          <strong>{t("app.name")}</strong>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
