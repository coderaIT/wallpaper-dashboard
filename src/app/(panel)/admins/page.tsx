"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, roleLabel } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import type { AdminAccount, Data, Page, Role } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader, Pagination } from "@/components/ui";

export default function AdminsPage() {
  const { admin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminAccount[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Page<AdminAccount>>(`/api/v1/admin/admins${qs({ page, limit: 20, search: debounced, role })}`);
      setItems(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(errorText(err));
    }
  }, [page, debounced, role]);

  useEffect(() => { void load(); }, [load]);

  if (!admin || admin.role !== "SUPER_ADMIN") {
    return (
      <div>
        <PageHeader title="المدراء" />
        <Empty title="هذه الصفحة لمدير النظام" />
      </div>
    );
  }

  async function remove(item: AdminAccount) {
    const ok = await confirm.ask({ title: "حذف الحساب", body: item.email, confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/admins/${item.id}`);
      toast.push("تم حذف الحساب");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <div>
      <PageHeader title="المدراء" hint="إنشاء الحسابات وتفعيلها وإعادة تعيين كلمة المرور.">
        <Button type="button" variant="primary" onClick={() => setCreating(true)}>مدير جديد</Button>
      </PageHeader>
      <div className="toolbar">
        <input placeholder="بحث بالاسم أو البريد" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}>
          <option value="">كل الأدوار</option>
          <option value="SUPER_ADMIN">مدير النظام</option>
          <option value="EDITOR">محرر</option>
        </select>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{roleLabel(item.role)}</td>
                <td><Badge tone={item.isActive ? "on" : "off"}>{item.isActive ? "نشط" : "موقوف"}</Badge></td>
                <td>{formatDate(item.lastLoginAt)}</td>
                <td className="row-actions">
                  <Button type="button" className="small" onClick={() => setEditing(item)}>تعديل</Button>
                  {item.id !== admin.id ? <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>حذف</Button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <Empty title="لا توجد حسابات" /> : null}
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      <CreateAdmin open={creating} onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); toast.push("تم إنشاء الحساب"); await load(); }} />
      <EditAdmin item={editing} selfId={admin.id} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); toast.push("تم تحديث الحساب"); await load(); }} />
    </div>
  );
}

function CreateAdmin({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("EDITOR");
      setError(null);
    }
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<Data<AdminAccount>>("/api/v1/admin/admins", { name: name.trim(), email: email.trim(), password, role });
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="مدير جديد" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="الاسم"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="البريد"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="كلمة المرور الابتدائية"><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Field label="الدور">
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="EDITOR">محرر</option>
            <option value="SUPER_ADMIN">مدير النظام</option>
          </select>
        </Field>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الإنشاء…" : "إنشاء"}</Button>
      </form>
    </Modal>
  );
}

function EditAdmin({
  item,
  selfId,
  onClose,
  onSaved,
}: {
  item: AdminAccount | null;
  selfId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setRole(item.role);
    setIsActive(item.isActive);
    setNewPassword("");
    setError(null);
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/v1/admin/admins/${item.id}`, { name: name.trim(), role, isActive });
      if (newPassword.trim()) {
        await api.patch(`/api/v1/admin/admins/${item.id}/password`, { newPassword });
      }
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={item !== null} title="تعديل الحساب" onClose={onClose}>
      {item ? (
        <form className="stack" onSubmit={submit}>
          {error ? <Alert>{error}</Alert> : null}
          <p className="muted">{item.email}</p>
          <Field label="الاسم"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="الدور">
            <select value={role} onChange={(event) => setRole(event.target.value as Role)} disabled={item.id === selfId}>
              <option value="EDITOR">محرر</option>
              <option value="SUPER_ADMIN">مدير النظام</option>
            </select>
          </Field>
          <label className="toggle"><input type="checkbox" checked={isActive} disabled={item.id === selfId} onChange={(event) => setIsActive(event.target.checked)} /> الحساب نشط</label>
          <Field label="كلمة مرور جديدة" hint="اتركها فارغة للإبقاء على الحالية. تُلغى جلساته.">
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ"}</Button>
        </form>
      ) : null}
    </Modal>
  );
}
