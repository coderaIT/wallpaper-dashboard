"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { entityLabel, formatDate } from "@/lib/format";
import type { AuditLog, Page } from "@/lib/types";
import { AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/types";
import { Alert, Empty, PageHeader, Pagination } from "@/components/ui";

export default function AuditPage() {
  const { admin } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<AuditLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Page<AuditLog>>(
        `/api/v1/admin/audit-logs${qs({ page, limit: 20, action, entityType, from, to })}`,
      );
      setItems(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(errorText(err));
    }
  }, [page, action, entityType, from, to]);

  useEffect(() => { void load(); }, [load]);

  if (!admin || admin.role !== "SUPER_ADMIN") {
    return (
      <div>
        <PageHeader title="سجل التدقيق" />
        <Empty title="هذه الصفحة لمدير النظام" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="سجل التدقيق" hint="أحدث العمليات أولاً." />
      <div className="toolbar">
        <select value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }}>
          <option value="">كل العمليات</option>
          {AUDIT_ACTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={entityType} onChange={(event) => { setPage(1); setEntityType(event.target.value); }}>
          <option value="">كل الكيانات</option>
          {ENTITY_TYPES.map((item) => <option key={item} value={item}>{entityLabel(item)}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} aria-label="من" />
        <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} aria-label="إلى" />
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>الوقت</th><th>المدير</th><th>العملية</th><th>الكيان</th><th>التفاصيل</th><th>IP</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.admin?.name ?? "—"}</td>
                <td className="mono">{item.action}</td>
                <td>{entityLabel(item.entityType)}</td>
                <td className="clip" title={item.metadata ? JSON.stringify(item.metadata) : ""}>{item.metadata ? JSON.stringify(item.metadata) : "—"}</td>
                <td className="mono">{item.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <Empty title="لا توجد سجلات" /> : null}
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
