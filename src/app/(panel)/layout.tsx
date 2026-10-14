"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { useI18n } from "@/lib/i18n";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "ready") return <div className="boot">{t("session.checking")}</div>;
  return <Shell>{children}</Shell>;
}
