"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { buildCategoryBody, deletionMessage, deletionRequest, emptyTranslations, translationsFromRows } from "@/lib/category-form";
import { fetchAllPages, formatNumber } from "@/lib/format";
import { LocaleCode, useI18n } from "@/lib/i18n";
import type { Category, Data, MediaItem } from "@/lib/types";
import { useConfirm, useToast } from "@/components/feedback";
import { LocaleTabs } from "@/components/locale-tabs";
import { MediaPicker } from "@/components/media-picker";
import { Alert, Badge, Button, Empty, Field, Modal, PageHeader } from "@/components/ui";

type Impact = {
  associatedWallpapers: number;
  exclusiveWallpapers: number;
  sharedWallpapers: number;
  mediaEligibleForCleanup: number;
};

type Draft = {
  id?: string;
  slug: string;
  isPublished: boolean;
  sortOrder: string;
  storedName: string;
  tab: LocaleCode;
  translations: ReturnType<typeof emptyTranslations>;
};

const emptyDraft = (): Draft => ({
  slug: "",
  isPublished: false,
  sortOrder: "0",
  storedName: "",
  tab: "ar",
  translations: emptyTranslations(),
});

export default function CategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { t, locale } = useI18n();
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
    const body = buildCategoryBody({
      slug: draft.slug,
      isPublished: draft.isPublished,
      sortOrder: Number(draft.sortOrder) || 0,
      editing: Boolean(draft.id),
      translations: draft.translations,
    });
    if (!String(body.name).trim()) {
      toast.push(t("category.needName"), "err");
      return;
    }
    setBusy(true);
    try {
      if (draft.id) await api.patch(`/api/v1/admin/categories/${draft.id}`, body);
      else await api.post("/api/v1/admin/categories", body);
      setDraft(null);
      toast.push(t("category.saved"));
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
    let impact: Impact = { associatedWallpapers: 0, exclusiveWallpapers: 0, sharedWallpapers: 0, mediaEligibleForCleanup: 0 };
    try {
      impact = (await api.get<Data<Impact>>(`/api/v1/admin/categories/${item.id}/deletion-impact`)).data;
    } catch (err) {
      toast.push(errorText(err), "err");
      return;
    }
    let deleteExclusive = false;
    const ok = await confirm.ask({
      title: t("category.deleteTitle"),
      body: `${deletionMessage(locale, impact.exclusiveWallpapers, impact.sharedWallpapers, false)} ${deletionMessage(locale, impact.exclusiveWallpapers, impact.sharedWallpapers, true)}`,
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      danger: true,
      extra: (
        <label className="toggle">
          <input type="checkbox" onChange={(event) => { deleteExclusive = event.target.checked; }} />
          {t("category.deleteExclusive")} ({impact.mediaEligibleForCleanup})
        </label>
      ),
    });
    const request = deletionRequest(ok, deleteExclusive);
    if (!request.proceed) return;
    try {
      await api.del(`/api/v1/admin/categories/${item.id}${qs({ deleteExclusiveWallpapers: request.deleteExclusiveWallpapers })}`);
      toast.push(t("category.deleted"));
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
      toast.push(media ? t("category.coverSet") : t("category.coverCleared"));
      await load();
    } catch (err) {
      toast.push(errorText(err), "err");
    }
  }

  function openEdit(item: Category) {
    setDraft({
      id: item.id,
      slug: item.slug,
      isPublished: item.isPublished,
      sortOrder: String(item.sortOrder),
      storedName: item.translations?.length ? "" : item.name,
      tab: locale,
      translations: translationsFromRows(item.translations),
    });
  }

  const active = draft?.translations[draft.tab];

  return (
    <div>
      <PageHeader title={t("category.title")} hint={t("category.hint")}>
        <Button type="button" variant="primary" onClick={() => setDraft(emptyDraft())}>{t("category.new")}</Button>
      </PageHeader>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title={t("category.empty")} /> : null}
      <div className="stack">
        {items.map((item, index) => (
          <article key={item.id} className="card section-card">
            <div className="frame" style={{ width: 72, aspectRatio: "3 / 4", borderRadius: 12, overflow: "hidden" }}>
              {item.cover?.thumbnailUrl ? <img src={item.cover.thumbnailUrl} alt="" /> : null}
            </div>
            <div className="grow">
              <strong>{item.name}</strong>
              <div className="meta-row" style={{ marginTop: 6 }}>
                <Badge tone={item.isPublished ? "on" : "off"}>{item.isPublished ? t("common.published") : t("common.hidden")}</Badge>
                <span className="muted">{item.slug}</span>
                <span className="muted">{formatNumber(item.publishedWallpaperCount)} / {formatNumber(item.wallpaperCount)} {t("category.wallpapers")}</span>
              </div>
            </div>
            <div className="row-actions">
              <Button type="button" className="small" disabled={index === 0} onClick={() => void move(index, -1)}>{t("common.up")}</Button>
              <Button type="button" className="small" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>{t("common.down")}</Button>
              <Button type="button" className="small" onClick={() => setCoverFor(item.id)}>{t("category.cover")}</Button>
              <Button type="button" className="small" onClick={() => void togglePublish(item)}>{item.isPublished ? t("common.hidden") : t("common.published")}</Button>
              <Button type="button" className="small" onClick={() => openEdit(item)}>{t("common.edit")}</Button>
              <Button type="button" className="small" variant="danger" onClick={() => void remove(item)}>{t("common.delete")}</Button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={draft !== null} title={draft?.id ? t("category.edit") : t("category.create")} onClose={() => setDraft(null)}>
        {draft && active ? (
          <form className="stack" onSubmit={save}>
            <LocaleTabs value={draft.tab} onChange={(tab) => setDraft({ ...draft, tab })} />
            {draft.storedName ? <p className="muted">{t("category.stored")}: {draft.storedName}</p> : null}
            <Field label={t("category.name")}>
              <input
                value={active.name}
                onChange={(event) => setDraft({
                  ...draft,
                  translations: { ...draft.translations, [draft.tab]: { ...active, name: event.target.value } },
                })}
              />
            </Field>
            <Field label={t("category.description")}>
              <textarea
                value={active.description}
                onChange={(event) => setDraft({
                  ...draft,
                  translations: { ...draft.translations, [draft.tab]: { ...active, description: event.target.value } },
                })}
              />
            </Field>
            <Field label={t("category.slug")} hint={t("category.slugHint")}><input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></Field>
            <Field label={t("category.order")}><input type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></Field>
            <label className="toggle"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} /> {t("common.published")}</label>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
          </form>
        ) : null}
      </Modal>

      <MediaPicker open={coverFor !== null} onClose={() => setCoverFor(null)} onSelect={(media) => void setCover(media)} />
      {coverFor ? (
        <div style={{ position: "fixed", bottom: 24, insetInlineStart: 24, zIndex: 45 }}>
          <Button type="button" variant="danger" onClick={() => void setCover(null)}>{t("category.removeCover")}</Button>
        </div>
      ) : null}
    </div>
  );
}
