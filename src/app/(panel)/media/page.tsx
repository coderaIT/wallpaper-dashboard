"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { formatBytes, formatNumber } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { Data, MediaItem, Page } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { Alert, Badge, Button, Empty, PageHeader, Pagination } from "@/components/ui";

type Cleanup = {
  dryRun: boolean;
  scannedObjects: number;
  orphanedObjects: number;
  deletedObjects: number;
  orphanedKeys: string[];
};

export default function MediaPage() {
  const { admin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [mimeType, setMimeType] = useState("");
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<Cleanup | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Page<MediaItem>>(
        `/api/v1/admin/media${qs({ page, limit: 24, search: debounced, mimeType, unused: unused || undefined })}`,
      );
      setItems(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(errorText(err));
    }
  }, [page, debounced, mimeType, unused]);

  useEffect(() => { void load(); }, [load]);

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    try {
      if (files.length === 1) {
        const form = new FormData();
        form.set("file", files[0]);
        await api.upload("/api/v1/admin/media", form);
        toast.push("تم رفع الصورة");
      } else {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        const res = await api.upload<Data<{ succeeded: number; failed: number }>>("/api/v1/admin/media/bulk", form);
        toast.push(`نجح ${res.data.succeeded} وفشل ${res.data.failed}`);
      }
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: MediaItem) {
    const ok = await confirm.ask({ title: "حذف الوسيط", body: item.originalFilename, confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/media/${item.id}`);
      toast.push("تم الحذف");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  async function runCleanup(dryRun: boolean) {
    if (!dryRun) {
      const ok = await confirm.ask({
        title: "حذف الملفات اليتيمة",
        body: "تُحذف كائنات التخزين التي لا سجل لها في قاعدة البيانات.",
        confirmText: "حذف",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const res = await api.post<Data<Cleanup>>(`/api/v1/admin/media/cleanup${qs({ dryRun })}`);
      setCleanup(res.data);
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <div>
      <PageHeader title="الوسائط" hint="الصور الأصلية مع المعاينة والمصغّر.">
        <label className={`btn primary ${busy ? "" : ""}`}>
          {busy ? "جاري الرفع…" : "رفع صور"}
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />
        </label>
      </PageHeader>
      <div className="toolbar">
        <input placeholder="بحث باسم الملف" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        <select value={mimeType} onChange={(event) => { setPage(1); setMimeType(event.target.value); }}>
          <option value="">كل الأنواع</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
        <label className="toggle"><input type="checkbox" checked={unused} onChange={(event) => { setPage(1); setUnused(event.target.checked); }} /> غير المستخدمة فقط</label>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title="لا توجد وسائط" /> : null}
      <div className="media-grid">
        {items.map((item) => {
          const used = item.usage.wallpapers + item.usage.categories + item.usage.banners;
          return (
            <article key={item.id} className="media-card">
              <div className="frame"><img src={item.thumbnail.url} alt={item.originalFilename} /></div>
              <div className="media-meta">
                <strong title={item.originalFilename}>{item.originalFilename}</strong>
                <span className="muted">{item.original.width}×{item.original.height} · {formatBytes(item.original.size)}</span>
                <div className="meta-row">
                  <Badge tone={used === 0 ? "off" : "on"}>{used === 0 ? "غير مستخدمة" : `${formatNumber(used)} استخدام`}</Badge>
                </div>
                <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>حذف</Button>
              </div>
            </article>
          );
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      {admin?.role === "SUPER_ADMIN" ? (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>تنظيف التخزين</h2>
          <p className="muted">يبحث عن ملفات أقدم من ساعة بلا سجل. الفحص لا يحذف شيئاً.</p>
          <div className="page-actions">
            <Button type="button" onClick={() => void runCleanup(true)}>فحص</Button>
            <Button type="button" variant="danger" onClick={() => void runCleanup(false)}>حذف اليتيمة</Button>
          </div>
          {cleanup ? (
            <div className="stack" style={{ marginTop: 12 }}>
              <p>فُحص {formatNumber(cleanup.scannedObjects)} · يتيم {formatNumber(cleanup.orphanedObjects)} · حُذف {formatNumber(cleanup.deletedObjects)}</p>
              {cleanup.orphanedKeys.slice(0, 20).map((key) => <div key={key} className="muted">{key}</div>)}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
