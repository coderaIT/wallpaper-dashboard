"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Button, Field } from "@/components/ui";

export default function LoginPage() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<"check" | "ok" | "down">("check");

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("password") === "changed" || sessionStorage.getItem("wallpaper.passwordChanged") === "1") {
      sessionStorage.removeItem("wallpaper.passwordChanged");
      setInfo("تم تغيير كلمة المرور. سجّل الدخول من جديد.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/health")
      .then(async (res) => {
        if (!res.ok) throw new Error("down");
        const body = (await res.json()) as { data?: { status?: string } };
        if (!cancelled) setHealth(body.data?.status === "ok" ? "ok" : "down");
      })
      .catch(() => {
        if (!cancelled) setHealth("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (status !== "anonymous") {
    return <div className="boot">جاري التحقق من الجلسة…</div>;
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand-mark">و</div>
        <div>
          <h1>استوديو الخلفيات</h1>
          <p>إدارة الخلفيات والتصنيفات والبانرات وأقسام الصفحة الرئيسية من مكان واحد.</p>
        </div>
        <div className={`health ${health === "ok" ? "ok" : health === "down" ? "down" : ""}`}>
          <i />
          {health === "check" && "جاري فحص اتصال الواجهة البرمجية"}
          {health === "ok" && "الواجهة البرمجية متصلة"}
          {health === "down" && "الواجهة البرمجية غير متاحة"}
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <h2>تسجيل الدخول</h2>
          <p className="sub">حساب مدير أو محرر.</p>
          {info ? <div className="note">{info}</div> : null}
          {error ? <Alert>{error}</Alert> : null}
          <div className="stack">
            <Field label="البريد">
              <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="كلمة المرور">
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Button type="submit" variant="primary" className="block" disabled={busy}>
              {busy ? "جاري الدخول…" : "دخول"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
