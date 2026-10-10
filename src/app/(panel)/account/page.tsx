"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { Alert, Button, Field, PageHeader } from "@/components/ui";

export default function AccountPage() {
  const { admin, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/v1/admin/auth/change-password", { currentPassword, newPassword });
      sessionStorage.setItem("wallpaper.passwordChanged", "1");
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="الحساب" hint="تغيير كلمة المرور يلغي كل الجلسات." />
      <div className="grid-2">
        <section className="card">
          <h2>الملف</h2>
          <p><strong>{admin?.name}</strong></p>
          <p className="muted">{admin?.email}</p>
          <p className="muted">{admin ? roleLabel(admin.role) : ""}</p>
        </section>
        <form className="card stack" onSubmit={submit}>
          <h2>كلمة المرور</h2>
          {error ? <Alert>{error}</Alert> : null}
          <Field label="الحالية"><input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
          <Field label="الجديدة"><input type="password" required autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
          <Field label="تأكيد الجديدة"><input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري التغيير…" : "تغيير كلمة المرور"}</Button>
        </form>
      </div>
    </div>
  );
}
