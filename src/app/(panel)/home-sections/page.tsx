"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { fetchAllPages, sectionLabel } from "@/lib/format";
import type { Category, HomeSection, Page, SectionType, Wallpaper } from "@/lib/types";
import { SECTION_TYPES } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { LocalizedFields } from "@/components/locale-tabs";
import { emptyTranslations, translationsFromRows } from "@/lib/category-form";
import type { LocaleCode } from "@/lib/i18n";

type FormState = {
  id?: string;
  title: string;
  copies: Record<LocaleCode, { name: string; description: string }>;
  sectionType: SectionType;
  isEnabled: boolean;
  limit: string;
  orientation: string;
  sort: string;
  categoryId: string;
  categoryIds: string[];
  wallpaperIds: string[];
};

const emptyForm = (): FormState => ({
  title: "",
  copies: emptyTranslations(),
  sectionType: "LATEST_WALLPAPERS",
  isEnabled: true,
  limit: "10",
  orientation: "",
  sort: "latest",
  categoryId: "",
  categoryIds: [],
  wallpaperIds: [],
});

function fromSection(section: HomeSection): FormState {
  const config = section.configuration ?? {};
  return {
    id: section.id,
    title: section.title,
    copies: translationsFromRows(section.translations),
    sectionType: section.sectionType,
    isEnabled: section.isEnabled,
    limit: config.limit != null ? String(config.limit) : "10",
    orientation: typeof config.orientation === "string" ? config.orientation : "",
    sort: typeof config.sort === "string" ? config.sort : "latest",
    categoryId: typeof config.categoryId === "string" ? config.categoryId : "",
    categoryIds: Array.isArray(config.categoryIds) ? config.categoryIds.filter((id): id is string => typeof id === "string") : [],
    wallpaperIds: Array.isArray(config.wallpaperIds) ? config.wallpaperIds.filter((id): id is string => typeof id === "string") : [],
  };
}

function buildConfig(form: FormState) {
  const limit = Number(form.limit);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : undefined;
  if (form.sectionType === "BANNERS") return { limit: safeLimit ?? 5 };
  if (form.sectionType === "FEATURED_WALLPAPERS" || form.sectionType === "POPULAR_WALLPAPERS" || form.sectionType === "LATEST_WALLPAPERS") {
    return { ...(safeLimit ? { limit: safeLimit } : {}), ...(form.orientation ? { orientation: form.orientation } : {}) };
  }
  if (form.sectionType === "CATEGORY_WALLPAPERS") {
    return {
      categoryId: form.categoryId,
      limit: safeLimit ?? 10,
      sort: form.sort || "latest",
      ...(form.orientation ? { orientation: form.orientation } : {}),
    };
  }
  if (form.sectionType === "CUSTOM_WALLPAPERS") return { wallpaperIds: form.wallpaperIds };
  return { categoryIds: form.categoryIds.length ? form.categoryIds : null, limit: safeLimit ?? 12 };
}

export default function HomeSectionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<HomeSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sections, cats] = await Promise.all([
        api.get<{ data: HomeSection[] }>("/api/v1/admin/home-sections"),
        fetchAllPages<Category>("/api/v1/admin/categories", { sortBy: "name", sortDir: "asc" }),
      ]);
      setItems(sections.data);
      setCategories(cats);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (form.sectionType === "CATEGORY_WALLPAPERS" && !form.categoryId) {
      toast.push("اختر التصنيف", "err");
      return;
    }
    if (form.sectionType === "CUSTOM_WALLPAPERS" && form.wallpaperIds.length === 0) {
      toast.push("أضف خلفية واحدة على الأقل", "err");
      return;
    }
    setBusy(true);
    const configuration = buildConfig(form);
    const rows = (["ar", "tr", "en"] as const).flatMap((locale) => {
      const title = form.copies[locale].name.trim();
      if (!title) return [];
      return [{ locale, title }];
    });
    const english = rows.find((row) => row.locale === "en");
    const title = english?.title || rows[0]?.title || form.title.trim();
    const translations = rows.length ? rows : undefined;
    try {
      if (form.id) {
        await api.patch(`/api/v1/admin/home-sections/${form.id}`, {
          title,
          sectionType: form.sectionType,
          isEnabled: form.isEnabled,
          configuration,
          ...(translations ? { translations } : {}),
        });
      } else {
        await api.post("/api/v1/admin/home-sections", {
          title,
          sectionType: form.sectionType,
          configuration,
          ...(translations ? { translations } : {}),
        });
      }
      setForm(null);
      toast.push("تم حفظ القسم");
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
      await api.patch("/api/v1/admin/home-sections/reorder", {
        items: next.map((item, order) => ({ id: item.id, sortOrder: order })),
      });
    } catch (err) {
      toast.push(errorText(err), "err");
      await load();
    }
  }

  async function toggle(item: HomeSection) {
    try {
      await api.patch(`/api/v1/admin/home-sections/${item.id}`, { isEnabled: !item.isEnabled });
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  async function remove(item: HomeSection) {
    const ok = await confirm.ask({ title: "حذف القسم", body: item.title, confirmText: "حذف", danger: true });
    if (!ok) return;
    try {
      await api.del(`/api/v1/admin/home-sections/${item.id}`);
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  return (
    <div>
      <PageHeader title="أقسام الرئيسية" hint="ترتيب ما يراه التطبيق في الصفحة الرئيسية.">
        <Button type="button" variant="primary" onClick={() => setForm(emptyForm())}>قسم جديد</Button>
      </PageHeader>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title="لا توجد أقسام" /> : null}
      <div className="stack">
        {items.map((item, index) => (
          <article key={item.id} className="card section-card">
            <Badge tone="gold">{index + 1}</Badge>
            <div className="grow">
              <strong>{item.title}</strong>
              <div className="meta-row" style={{ marginTop: 6 }}>
                <Badge>{sectionLabel(item.sectionType)}</Badge>
                <Badge tone={item.isEnabled ? "on" : "off"}>{item.isEnabled ? "ظاهر" : "مخفي"}</Badge>
              </div>
            </div>
            <div className="row-actions">
              <Button type="button" className="small" disabled={index === 0} onClick={() => void move(index, -1)}>أعلى</Button>
              <Button type="button" className="small" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>أسفل</Button>
              <Button type="button" className="small" onClick={() => void toggle(item)}>{item.isEnabled ? "إخفاء" : "إظهار"}</Button>
              <Button type="button" className="small" onClick={() => setForm(fromSection(item))}>تعديل</Button>
              <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>حذف</Button>
            </div>
          </article>
        ))}
      </div>
      <Modal open={form !== null} title={form?.id ? "تعديل القسم" : "قسم جديد"} onClose={() => setForm(null)} wide>
        {form ? (
          <form className="stack" onSubmit={save}>
            <div className="form-grid">
              <LocalizedFields
                value={form.copies}
                onChange={(copies) => setForm({ ...form, copies })}
                primary="Title"
              />
              <Field label="النوع">
                <select value={form.sectionType} onChange={(event) => setForm({ ...form, sectionType: event.target.value as SectionType })}>
                  {SECTION_TYPES.map((type) => <option key={type} value={type}>{sectionLabel(type)}</option>)}
                </select>
              </Field>
              {form.sectionType !== "CUSTOM_WALLPAPERS" ? (
                <Field label="العدد" hint="من 1 إلى 50"><input type="number" min={1} max={50} value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} /></Field>
              ) : null}
              {form.sectionType !== "BANNERS" && form.sectionType !== "CATEGORIES" && form.sectionType !== "CUSTOM_WALLPAPERS" ? (
                <Field label="الاتجاه">
                  <select value={form.orientation} onChange={(event) => setForm({ ...form, orientation: event.target.value })}>
                    <option value="">الكل</option>
                    <option value="PORTRAIT">عمودي</option>
                    <option value="LANDSCAPE">أفقي</option>
                    <option value="SQUARE">مربع</option>
                  </select>
                </Field>
              ) : null}
              {form.sectionType === "CATEGORY_WALLPAPERS" ? (
                <>
                  <Field label="التصنيف">
                    <select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                      <option value="">اختر</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label="الفرز">
                    <select value={form.sort} onChange={(event) => setForm({ ...form, sort: event.target.value })}>
                      <option value="latest">الأحدث</option>
                      <option value="popular">الأشهر</option>
                      <option value="manual">يدوي</option>
                    </select>
                  </Field>
                </>
              ) : null}
            </div>
            {form.sectionType === "CATEGORIES" ? (
              <Field label="تصنيفات محددة" hint="اتركها فارغة لعرض التصنيفات حسب ترتيبها.">
                <div className="check-list">
                  {categories.map((category) => (
                    <label key={category.id}>
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(category.id)}
                        onChange={() => setForm({
                          ...form,
                          categoryIds: form.categoryIds.includes(category.id)
                            ? form.categoryIds.filter((id) => id !== category.id)
                            : [...form.categoryIds, category.id],
                        })}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </Field>
            ) : null}
            {form.sectionType === "CUSTOM_WALLPAPERS" ? (
              <WallpaperPicker ids={form.wallpaperIds} onChange={(wallpaperIds) => setForm({ ...form, wallpaperIds })} />
            ) : null}
            {form.id ? (
              <label className="toggle"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} /> ظاهر</label>
            ) : null}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ"}</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function WallpaperPicker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Wallpaper[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      api.get<Page<Wallpaper>>(`/api/v1/admin/wallpapers${qs({ search: query.trim(), limit: 8 })}`)
        .then((res) => setHits(res.data))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Field label="الخلفيات" hint="ابحث وأضف. الترتيب هنا هو ترتيب العرض.">
      <input placeholder="ابحث بعنوان الخلفية" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="check-list">
        {hits.map((hit) => (
          <button
            key={hit.id}
            type="button"
            className="btn small"
            disabled={ids.includes(hit.id)}
            onClick={() => onChange([...ids, hit.id])}
          >
            {hit.title}
          </button>
        ))}
      </div>
      <div className="chips">
        {ids.map((id, index) => (
          <button key={id} type="button" className="chip" onClick={() => onChange(ids.filter((item) => item !== id))}>
            {index + 1}. {id.slice(0, 8)}… ×
          </button>
        ))}
      </div>
    </Field>
  );
}
