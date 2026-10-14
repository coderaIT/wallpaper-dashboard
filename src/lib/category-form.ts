export type LocaleCode = "ar" | "tr" | "en";

export type NamedTranslation = { locale: LocaleCode; name: string; description: string };

const LOCALES: LocaleCode[] = ["ar", "tr", "en"];

export function emptyTranslations(): Record<LocaleCode, { name: string; description: string }> {
  return { ar: { name: "", description: "" }, tr: { name: "", description: "" }, en: { name: "", description: "" } };
}

export function translationsFromRows(
  rows: { locale: string; name?: string; title?: string; description?: string | null; subtitle?: string | null }[] | undefined,
): Record<LocaleCode, { name: string; description: string }> {
  const next = emptyTranslations();
  for (const row of rows ?? []) {
    if (row.locale !== "ar" && row.locale !== "tr" && row.locale !== "en") continue;
    next[row.locale] = {
      name: row.name ?? row.title ?? "",
      description: row.description ?? row.subtitle ?? "",
    };
  }
  return next;
}

/** Sends only locales the administrator actually filled. Does not copy one language into another. */
export function buildCategoryBody(input: {
  slug: string;
  isPublished: boolean;
  sortOrder: number;
  editing: boolean;
  translations: Record<LocaleCode, { name: string; description: string }>;
}): Record<string, unknown> {
  const filled = LOCALES.flatMap((locale) => {
    const name = input.translations[locale].name.trim();
    if (!name) return [];
    const description = input.translations[locale].description.trim();
    return [{ locale, name, description: description || null }];
  });
  const english = filled.find((row) => row.locale === "en");
  const fallback = english ?? filled[0];
  const body: Record<string, unknown> = {
    name: fallback?.name ?? "",
    isPublished: input.isPublished,
    sortOrder: input.sortOrder,
    translations: filled,
  };
  if (input.slug.trim()) body.slug = input.slug.trim();
  if (input.editing) body.description = fallback?.description ?? null;
  else if (fallback?.description) body.description = fallback.description;
  return body;
}

export function deletionMessage(locale: LocaleCode, exclusive: number, shared: number, deleteExclusive: boolean): string {
  if (!deleteExclusive) {
    if (locale === "ar") return `سيُحذف التصنيف فقط. تبقى ${exclusive} خلفية حصرية و${shared} خلفية مشتركة.`;
    if (locale === "tr") return `Yalnızca kategori silinir. ${exclusive} özel ve ${shared} paylaşılan duvar kağıdı korunur.`;
    return `Only the category will be deleted. ${exclusive} exclusive and ${shared} shared wallpapers will be kept.`;
  }
  if (locale === "ar") {
    return `حذف هذا التصنيف وخلفياته الحصرية وعددها ${exclusive}؟ ستبقى ${shared} خلفية مشتركة مع تصنيفات أخرى.`;
  }
  if (locale === "tr") {
    return `Bu kategori ve yalnızca ona ait ${exclusive} duvar kağıdı silinsin mi? Diğer kategorilerle paylaşılan ${shared} duvar kağıdı korunur.`;
  }
  return `Delete this category and its ${exclusive} exclusive wallpapers? ${shared} wallpapers shared with other categories will be preserved.`;
}

export function deletionRequest(confirmed: boolean, deleteExclusive: boolean) {
  return { proceed: confirmed, deleteExclusiveWallpapers: confirmed && deleteExclusive };
}

export function canManageCategories(status: "ready" | "anonymous" | "loading") {
  return status === "ready";
}
