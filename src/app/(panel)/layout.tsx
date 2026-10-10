"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "ready") return <div className="boot">جاري التحقق من الجلسة…</div>;
  return <Shell>{children}</Shell>;
}
