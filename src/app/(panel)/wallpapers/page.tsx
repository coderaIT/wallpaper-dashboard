"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { fetchAllPages, formatNumber, orientationLabel, splitTags } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import type { BulkFileResult, Category, Data, MediaItem, Page, Wallpaper } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { MediaPicker } from "@/components/media-picker";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader, Pagination } from "@/components/ui";

type Editor =
  | { mode: "edit"; wallpaper: Wallpaper }
  | { mode: "create"; media: MediaItem };

export default function WallpapersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [published, setPublished] = useState("");
  const [featured, setFeatured] = useState("");
  const [orientation, setOrientation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categoryAction, setCategoryAction] = useState<"ADD_CATEGORIES" | "REMOVE_CATEGORIES" | null>(null);

  useEffect(() => {
    fetchAllPages<Category>("/api/v1/admin/categories", { sortBy: "name", sortDir: "asc" })
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Page<Wallpaper>>(
        `/api/v1/admin/wallpapers${qs({
          page,
          limit: 24,
          search: debounced,
          categoryId,
          isPublished: published === "" ? undefined : published === "true",
          isFeatured: featured === "" ? undefined : featured === "true",
          orientation,
          sortBy: "createdAt",
          sortDir: "desc",
        })}`,
      );
      setItems(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, categoryId, published, featured, orientation]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function bulk(action: string, extra?: Record<string, unknown>) {
    try {
      const res = await api.patch<Data<{ succeeded: number; failed: number }>>("/api/v1/admin/wallpapers/bulk", {
        action,
        ids: selected,
        ...extra,
      });
      toast.push(`تم تحديث ${res.data.succeeded}، وتعذر ${res.data.failed}`);
      setSelected([]);
      setCategoryAction(null);
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  async function removeSelected() {
    const ok = await confirm.ask({
      title: "حذف الخلفيات",
      body: `سيتم حذف ${selected.length} خلفية. الصور تبقى في الوسائط.`,
      confirmText: "حذف",
      danger: true,
    });
    if (ok) await bulk("DELETE");
  }

  async function publishOne(item: Wallpaper) {
    try {
      await api.patch(`/api/v1/admin/wallpapers/${item.id}/publish`, { isPublished: !item.isPublished });
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <div>
      <PageHeader title="الخلفيات" hint="رفع، نشر، تمييز، وربط بالتصنيفات.">
        <Button type="button" onClick={() => setPickerOpen(true)}>من وسائط موجودة</Button>
        <Button type="button" variant="primary" onClick={() => setUploadOpen(true)}>رفع خلفيات</Button>
      </PageHeader>
      <div className="toolbar">
        <input placeholder="بحث في العنوان والوصف والوسوم" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
        <select value={published} onChange={(event) => { setPage(1); setPublished(event.target.value); }}>
          <option value="">كل حالات النشر</option>
          <option value="true">منشورة</option>
          <option value="false">مسودة</option>
        </select>
        <select value={featured} onChange={(event) => { setPage(1); setFeatured(event.target.value); }}>
          <option value="">التمييز</option>
          <option value="true">مميزة</option>
          <option value="false">غير مميزة</option>
        </select>
        <select value={orientation} onChange={(event) => { setPage(1); setOrientation(event.target.value); }}>
          <option value="">كل الاتجاهات</option>
          <option value="PORTRAIT">عمودي</option>
          <option value="LANDSCAPE">أفقي</option>
          <option value="SQUARE">مربع</option>
        </select>
        <select value={categoryId} onChange={(event) => { setPage(1); setCategoryId(event.target.value); }}>
          <option value="">كل التصنيفات</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <Button type="button" className="small" onClick={() => setSelected(selected.length === items.length ? [] : items.map((item) => item.id))}>
          {selected.length === items.length && items.length > 0 ? "إلغاء التحديد" : "تحديد الصفحة"}
        </Button>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <p className="muted">جاري التحميل…</p> : null}
      {!loading && items.length === 0 ? <Empty title="لا توجد خلفيات" hint="ارفع صوراً أو غيّر عوامل التصفية." /> : null}
      <div className="wp-grid">
        {items.map((item) => (
          <article key={item.id} className={`wp-card ${selected.includes(item.id) ? "selected" : ""}`}>
            <div className="frame">
              <input className="pick" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`تحديد ${item.title}`} />
              {item.image?.thumbnailUrl ? <img src={item.image.thumbnailUrl} alt={item.title} /> : null}
            </div>
            <div className="wp-meta">
              <strong title={item.title}>{item.title}</strong>
              <div className="meta-row">
                <Badge tone={item.isPublished ? "on" : "off"}>{item.isPublished ? "منشورة" : "مسودة"}</Badge>
                {item.isFeatured ? <Badge tone="gold">مميزة</Badge> : null}
                <Badge>{orientationLabel(item.orientation)}</Badge>
              </div>
              <span className="muted">{formatNumber(item.stats.views)} مشاهدة · {formatNumber(item.stats.downloads)} تنزيل</span>
              <div className="wp-actions">
                <Button type="button" className="small" onClick={() => setEditor({ mode: "edit", wallpaper: item })}>تعديل</Button>
                <Button type="button" className="small" onClick={() => void publishOne(item)}>{item.isPublished ? "إلغاء النشر" : "نشر"}</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      {selected.length > 0 ? (
        <div className="bulkbar">
          <span>{selected.length} محددة</span>
          <Button type="button" className="small" onClick={() => void bulk("PUBLISH")}>نشر</Button>
          <Button type="button" className="small" onClick={() => void bulk("UNPUBLISH")}>إلغاء النشر</Button>
          <Button type="button" className="small" onClick={() => void bulk("FEATURE")}>تمييز</Button>
          <Button type="button" className="small" onClick={() => void bulk("UNFEATURE")}>إزالة التمييز</Button>
          <Button type="button" className="small" onClick={() => setCategoryAction("ADD_CATEGORIES")}>إضافة تصنيف</Button>
          <Button type="button" className="small" onClick={() => setCategoryAction("REMOVE_CATEGORIES")}>إزالة تصنيف</Button>
          <Button type="button" className="small" variant="danger" onClick={() => void removeSelected()}>حذف</Button>
        </div>
      ) : null}

      <UploadModal
        open={uploadOpen}
        categories={categories}
        onClose={() => setUploadOpen(false)}
        onDone={async (message) => {
          toast.push(message);
          setUploadOpen(false);
          await load();
        }}
      />
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(media) => { setPickerOpen(false); setEditor({ mode: "create", media }); }} />
      <EditorModal
        editor={editor}
        categories={categories}
        onClose={() => setEditor(null)}
        onSaved={async () => {
          setEditor(null);
          toast.push("تم حفظ الخلفية");
          await load();
        }}
      />
      <CategoryBulkModal
        open={categoryAction !== null}
        title={categoryAction === "REMOVE_CATEGORIES" ? "إزالة تصنيفات" : "إضافة تصنيفات"}
        categories={categories}
        onClose={() => setCategoryAction(null)}
        onSubmit={(ids) => {
          if (categoryAction) void bulk(categoryAction, { categoryIds: ids });
        }}
      />
    </div>
  );
}

function UploadModal({
  open,
  categories,
  onClose,
  onDone,
}: {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkFileResult<Wallpaper> | null>(null);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setResults(null);
      setError(null);
    }
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      if (categoryIds.length) form.set("categoryIds", categoryIds.join(","));
      form.set("isPublished", String(isPublished));
      form.set("isFeatured", String(isFeatured));
      const res = await api.upload<Data<BulkFileResult<Wallpaper>>>("/api/v1/admin/wallpapers/upload", form);
      setResults(res.data);
      if (res.data.failed === 0) await onDone(`رُفعت ${res.data.succeeded} خلفية`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="رفع خلفيات" onClose={onClose} wide>
      <form className="stack" onSubmit={submit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="الصور" hint="JPEG أو PNG أو WebP. العنوان يُؤخذ من اسم الملف.">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
        </Field>
        {files.length > 0 ? <p className="muted">{files.length} ملفات</p> : null}
        <Field label="التصنيفات">
          <div className="check-list">
            {categories.map((category) => (
              <label key={category.id}>
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => setCategoryIds((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])}
                />
                {category.name}
              </label>
            ))}
          </div>
        </Field>
        <label className="toggle"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> نشر مباشرة</label>
        <label className="toggle"><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /> تمييز</label>
        <Button type="submit" variant="primary" disabled={busy || files.length === 0}>{busy ? "جاري الرفع…" : "رفع وإنشاء"}</Button>
        {results ? (
          <div className="stack">
            <p>نجح {results.succeeded} · فشل {results.failed}</p>
            {results.results.filter((row) => row.status === "error").map((row) => (
              <div key={row.index} className="alert">{row.filename ?? `ملف ${row.index + 1}`}: {row.error?.message}</div>
            ))}
            {results.failed === 0 ? null : <Button type="button" onClick={() => void onDone("تم تحديث القائمة")}>إغلاق وتحديث</Button>}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function EditorModal({
  editor,
  categories,
  onClose,
  onSaved,
}: {
  editor: Editor | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const wallpaper = editor?.mode === "edit" ? editor.wallpaper : null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [mediaId, setMediaId] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [deleteMedia, setDeleteMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      const item = editor.wallpaper;
      setTitle(item.title);
      setDescription(item.description ?? "");
      setSlug(item.slug);
      setTags(item.tags.join(", "));
      setCategoryIds(item.categories.map((category) => category.id));
      setIsPublished(item.isPublished);
      setIsFeatured(item.isFeatured);
      setSortOrder(String(item.sortOrder ?? 0));
      setMediaId(item.image.mediaId);
      setPreview(item.image.previewUrl || item.image.thumbnailUrl);
    } else {
      const name = editor.media.originalFilename.replace(/\.[^.]+$/, "");
      setTitle(name);
      setDescription("");
      setSlug("");
      setTags("");
      setCategoryIds([]);
      setIsPublished(false);
      setIsFeatured(false);
      setSortOrder("0");
      setMediaId(editor.media.id);
      setPreview(editor.media.preview.url);
    }
    setDeleteMedia(false);
    setError(null);
  }, [editor]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      title: title.trim(),
      mediaId,
      categoryIds,
      tags: splitTags(tags),
      isPublished,
      isFeatured,
    };
    if (slug.trim()) body.slug = slug.trim();
    if (wallpaper) {
      body.description = description.trim() || null;
      body.sortOrder = Number(sortOrder) || 0;
    } else if (description.trim()) {
      body.description = description.trim();
    }
    try {
      if (wallpaper) await api.patch(`/api/v1/admin/wallpapers/${wallpaper.id}`, body);
      else await api.post("/api/v1/admin/wallpapers", body);
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!wallpaper) return;
    const ok = await confirm.ask({ title: "حذف الخلفية", body: wallpaper.title, confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/wallpapers/${wallpaper.id}${qs({ deleteMedia })}`);
      await onSaved();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <Modal open={editor !== null} title={wallpaper ? "تعديل الخلفية" : "خلفية جديدة"} onClose={onClose} wide>
      <form className="stack" onSubmit={save}>
        {error ? <Alert>{error}</Alert> : null}
        <div className="grid-2">
          <div className="stack">
            {preview ? <img src={preview} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 12, background: "#0b0a09" }} /> : null}
            <Button type="button" onClick={() => setPicker(true)}>تغيير الصورة</Button>
            {wallpaper ? (
              <p className="muted">{wallpaper.width}×{wallpaper.height} · {orientationLabel(wallpaper.orientation)}</p>
            ) : null}
          </div>
          <div className="form-grid">
            <Field label="العنوان" className="full"><input required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
            <Field label="الوصف" className="full"><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
            <Field label="المسار" hint="يُولَّد من العنوان إذا تُرك فارغاً عند الإنشاء"><input value={slug} onChange={(event) => setSlug(event.target.value)} /></Field>
            <Field label="الترتيب"><input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} /></Field>
            <Field label="الوسوم" className="full" hint="افصل بينها بفاصلة"><input value={tags} onChange={(event) => setTags(event.target.value)} /></Field>
            <Field label="التصنيفات" className="full">
              <div className="check-list">
                {categories.map((category) => (
                  <label key={category.id}>
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => setCategoryIds((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </Field>
            <label className="toggle"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> منشورة</label>
            <label className="toggle"><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /> مميزة</label>
          </div>
        </div>
        <div className="page-actions">
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ"}</Button>
          {wallpaper ? (
            <>
              <label className="toggle"><input type="checkbox" checked={deleteMedia} onChange={(event) => setDeleteMedia(event.target.checked)} /> حذف الصورة إن لم تُستخدم</label>
              <Button type="button" variant="danger" onClick={() => void remove()}>حذف</Button>
            </>
          ) : null}
        </div>
      </form>
      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(media) => {
          setMediaId(media.id);
          setPreview(media.preview.url);
          setPicker(false);
        }}
      />
    </Modal>
  );
}

function CategoryBulkModal({
  open,
  title,
  categories,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  categories: Category[];
  onClose: () => void;
  onSubmit: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { if (open) setIds([]); }, [open]);
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="check-list">
        {categories.map((category) => (
          <label key={category.id}>
            <input type="checkbox" checked={ids.includes(category.id)} onChange={() => setIds((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])} />
            {category.name}
          </label>
        ))}
      </div>
      <div className="page-actions" style={{ marginTop: 12 }}>
        <Button type="button" variant="primary" disabled={ids.length === 0} onClick={() => onSubmit(ids)}>تطبيق</Button>
      </div>
    </Modal>
  );
}
