"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { fetchAllPages, formatNumber } from "@/lib/format";
import type { Category, MediaItem } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { MediaPicker } from "@/components/media-picker";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader } from "@/components/ui";

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
  sortOrder: string;
};

const emptyDraft = (): Draft => ({ name: "", slug: "", description: "", isPublished: false, sortOrder: "0" });

export default function CategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coverFor, setCoverFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchAllPages<Category>("/api/v1/admin/categories", { sortBy: "sortOrder", sortDir: "asc" }));
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        isPublished: draft.isPublished,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      if (draft.slug.trim()) body.slug = draft.slug.trim();
      if (draft.id) body.description = draft.description.trim() || null;
      else if (draft.description.trim()) body.description = draft.description.trim();
      if (draft.id) await api.patch(`/api/v1/admin/categories/${draft.id}`, body);
      else await api.post("/api/v1/admin/categories", body);
      setDraft(null);
      toast.push("تم حفظ التصنيف");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setItems(next);
    try {
      await api.patch("/api/v1/admin/categories/reorder", {
        items: next.map((item, order) => ({ id: item.id, sortOrder: order })),
      });
    } catch (err) {
      toast.push(errorText(err), "err");
      await load();
    }
  }

  async function togglePublish(item: Category) {
    try {
      await api.patch(`/api/v1/admin/categories/${item.id}`, { isPublished: !item.isPublished });
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  async function remove(item: Category) {
    const ok = await confirm.ask({
      title: "حذف التصنيف",
      body: "تُحذف روابط الخلفيات ويبقى التصنيف محذوفاً. الخلفيات نفسها تبقى.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/categories/${item.id}`);
      toast.push("تم حذف التصنيف");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  async function setCover(media: MediaItem | null) {
    if (!coverFor) return;
    try {
      await api.patch(`/api/v1/admin/categories/${coverFor}/cover`, { mediaId: media?.id ?? null });
      setCoverFor(null);
      toast.push(media ? "تم تعيين الغلاف" : "تمت إزالة الغلاف");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <div>
      <PageHeader title="التصنيفات" hint="الترتيب الظاهر في التطبيق، مع الغلاف وحالة النشر.">
        <Button type="button" variant="primary" onClick={() => setDraft(emptyDraft())}>تصنيف جديد</Button>
      </PageHeader>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title="لا توجد تصنيفات" /> : null}
      <div className="stack">
        {items.map((item, index) => (
          <article key={item.id} className="card section-card">
            <div className="frame" style={{ width: 72, aspectRatio: "3 / 4", borderRadius: 12, overflow: "hidden" }}>
              {item.cover?.thumbnailUrl ? <img src={item.cover.thumbnailUrl} alt="" /> : null}
            </div>
            <div className="grow">
              <strong>{item.name}</strong>
              <div className="meta-row" style={{ marginTop: 6 }}>
                <Badge tone={item.isPublished ? "on" : "off"}>{item.isPublished ? "منشور" : "مخفي"}</Badge>
                <span className="muted">{item.slug}</span>
                <span className="muted">{formatNumber(item.publishedWallpaperCount)} / {formatNumber(item.wallpaperCount)} خلفية</span>
              </div>
            </div>
            <div className="row-actions">
              <Button type="button" className="small" disabled={index === 0} onClick={() => void move(index, -1)}>أعلى</Button>
              <Button type="button" className="small" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>أسفل</Button>
              <Button type="button" className="small" onClick={() => setCoverFor(item.id)}>الغلاف</Button>
              <Button type="button" className="small" onClick={() => void togglePublish(item)}>{item.isPublished ? "إخفاء" : "نشر"}</Button>
              <Button type="button" className="small" onClick={() => setDraft({
                id: item.id,
                name: item.name,
                slug: item.slug,
                description: item.description ?? "",
                isPublished: item.isPublished,
                sortOrder: String(item.sortOrder),
              })}>تعديل</Button>
              <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>حذف</Button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={draft !== null} title={draft?.id ? "تعديل التصنيف" : "تصنيف جديد"} onClose={() => setDraft(null)}>
        {draft ? (
          <form className="stack" onSubmit={save}>
            <Field label="الاسم"><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="المسار" hint="يُولَّد من الاسم إذا تُرك فارغاً"><input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></Field>
            <Field label="الوصف"><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
            <Field label="الترتيب"><input type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></Field>
            <label className="toggle"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} /> منشور</label>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ"}</Button>
          </form>
        ) : null}
      </Modal>

      <MediaPicker open={coverFor !== null} onClose={() => setCoverFor(null)} onSelect={(media) => void setCover(media)} />
      {coverFor ? (
        <div style={{ position: "fixed", bottom: 24, insetInlineStart: 24, zIndex: 45 }}>
          <Button type="button" variant="danger" onClick={() => void setCover(null)}>إزالة الغلاف الحالي</Button>
        </div>
      ) : null}
    </div>
  );
}
