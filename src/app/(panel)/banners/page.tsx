"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { fetchAllPages, fromLocalInput, toLocalInput } from "@/lib/format";
import type { Banner, BannerAction, Category, MediaItem, Page } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { MediaPicker } from "@/components/media-picker";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader } from "@/components/ui";

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  actionType: BannerAction;
  actionValue: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  media: MediaItem | null;
  currentImage: string | null;
};

const emptyDraft = (): Draft => ({
  title: "",
  subtitle: "",
  actionType: "NONE",
  actionValue: "",
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
  media: null,
  currentImage: null,
});

export default function BannersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [banners, cats] = await Promise.all([
        api.get<Page<Banner>>(`/api/v1/admin/banners${qs({ page: 1, limit: 100 })}`),
        fetchAllPages<Category>("/api/v1/admin/categories", { sortBy: "name", sortDir: "asc" }),
      ]);
      const all = [...banners.data];
      for (let page = 2; page <= banners.meta.totalPages; page += 1) {
        const next = await api.get<Page<Banner>>(`/api/v1/admin/banners${qs({ page, limit: 100 })}`);
        all.push(...next.data);
      }
      setItems(all);
      setCategories(cats);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(item: Banner) {
    setDraft({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? "",
      actionType: item.actionType,
      actionValue: item.actionValue ?? "",
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
      media: null,
      currentImage: item.image?.previewUrl || item.image?.thumbnailUrl,
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const imageMediaId = draft.media?.id;
    if (!draft.id && !imageMediaId) {
      toast.push("اختر صورة البانر", "err");
      return;
    }
    setBusy(true);
    const body: Record<string, unknown> = {
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim() || null,
      actionType: draft.actionType,
      actionValue: draft.actionType === "NONE" ? null : draft.actionValue.trim(),
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder) || 0,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
    };
    if (imageMediaId) body.imageMediaId = imageMediaId;
    try {
      if (draft.id) await api.patch(`/api/v1/admin/banners/${draft.id}`, body);
      else await api.post("/api/v1/admin/banners", body);
      setDraft(null);
      toast.push("تم حفظ البانر");
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
      await api.patch("/api/v1/admin/banners/reorder", {
        items: next.map((item, order) => ({ id: item.id, sortOrder: order })),
      });
    } catch (err) {
      toast.push(errorText(err), "err");
      await load();
    }
  }

  async function remove(item: Banner) {
    const ok = await confirm.ask({ title: "حذف البانر", body: "تُحذف البطاقة وتبقى الصورة في الوسائط.", confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/banners/${item.id}`);
      toast.push("تم حذف البانر");
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  const preview = draft?.media?.preview.url || draft?.currentImage;

  return (
    <div>
      <PageHeader title="البانرات" hint="صور الصفحة الرئيسية مع إجراء وجدولة.">
        <Button type="button" variant="primary" onClick={() => setDraft(emptyDraft())}>بانر جديد</Button>
      </PageHeader>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title="لا توجد بانرات" /> : null}
      <div className="stack">
        {items.map((item, index) => (
          <article key={item.id} className="card section-card">
            <div className="frame" style={{ width: 120, aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden" }}>
              {item.image?.thumbnailUrl ? <img src={item.image.thumbnailUrl} alt="" /> : null}
            </div>
            <div className="grow">
              <strong>{item.title}</strong>
              <div className="meta-row" style={{ marginTop: 6 }}>
                <Badge tone={item.isActive ? "on" : "off"}>{item.isActive ? "مفعّل" : "متوقف"}</Badge>
                <span className="muted">{item.actionType}</span>
                {item.subtitle ? <span className="muted">{item.subtitle}</span> : null}
              </div>
            </div>
            <div className="row-actions">
              <Button type="button" className="small" disabled={index === 0} onClick={() => void move(index, -1)}>أعلى</Button>
              <Button type="button" className="small" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>أسفل</Button>
              <Button type="button" className="small" onClick={() => void api.patch(`/api/v1/admin/banners/${item.id}`, { isActive: !item.isActive }).then(load).catch((err) => toast.push(errorText(err), "err"))}>
                {item.isActive ? "إيقاف" : "تفعيل"}
              </Button>
              <Button type="button" className="small" onClick={() => openEdit(item)}>تعديل</Button>
              <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>حذف</Button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={draft !== null} title={draft?.id ? "تعديل البانر" : "بانر جديد"} onClose={() => setDraft(null)} wide>
        {draft ? (
          <form className="form-grid" onSubmit={save}>
            <div className="full">
              {preview ? <img src={preview} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }} /> : <p className="muted">لم تُختر صورة.</p>}
              <Button type="button" onClick={() => setPicker(true)} style={{ marginTop: 8 }}>اختيار الصورة</Button>
            </div>
            <Field label="العنوان"><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
            <Field label="العنوان الفرعي"><input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></Field>
            <Field label="الإجراء">
              <select value={draft.actionType} onChange={(event) => setDraft({ ...draft, actionType: event.target.value as BannerAction, actionValue: "" })}>
                <option value="NONE">بدون إجراء</option>
                <option value="OPEN_CATEGORY">فتح تصنيف</option>
                <option value="OPEN_URL">فتح رابط</option>
              </select>
            </Field>
            {draft.actionType === "OPEN_CATEGORY" ? (
              <Field label="التصنيف">
                <select required value={draft.actionValue} onChange={(event) => setDraft({ ...draft, actionValue: event.target.value })}>
                  <option value="">اختر تصنيفاً</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
            ) : null}
            {draft.actionType === "OPEN_URL" ? (
              <Field label="الرابط" hint="https عام">
                <input required type="url" value={draft.actionValue} onChange={(event) => setDraft({ ...draft, actionValue: event.target.value })} />
              </Field>
            ) : null}
            <Field label="يبدأ"><input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></Field>
            <Field label="ينتهي"><input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></Field>
            <Field label="الترتيب"><input type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></Field>
            <label className="toggle"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> مفعّل</label>
            <div className="full"><Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ"}</Button></div>
          </form>
        ) : null}
      </Modal>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={(media) => { if (draft) setDraft({ ...draft, media }); setPicker(false); }} />
    </div>
  );
}
