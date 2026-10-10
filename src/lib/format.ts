export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("ar-EG-u-nu-latn").format(value);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["بايت", "ك.ب", "م.ب", "غ.ب", "ت.ب"];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 ? 0 : 1;
  return `${value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: digits })} ${units[index]}`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("ar-EG-u-nu-latn", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "مدير النظام";
  if (role === "EDITOR") return "محرر";
  return role;
}

export function orientationLabel(value: string) {
  if (value === "PORTRAIT") return "عمودي";
  if (value === "LANDSCAPE") return "أفقي";
  if (value === "SQUARE") return "مربع";
  return value;
}

export function sectionLabel(value: string) {
  const map: Record<string, string> = {
    BANNERS: "البانرات",
    FEATURED_WALLPAPERS: "خلفيات مميزة",
    POPULAR_WALLPAPERS: "الأكثر شعبية",
    LATEST_WALLPAPERS: "الأحدث",
    CATEGORY_WALLPAPERS: "خلفيات تصنيف",
    CUSTOM_WALLPAPERS: "خلفيات محددة",
    CATEGORIES: "التصنيفات",
  };
  return map[value] ?? value;
}

export function entityLabel(value: string) {
  const map: Record<string, string> = {
    AUTH: "جلسة",
    ADMIN: "مدير",
    MEDIA: "وسائط",
    CATEGORY: "تصنيف",
    WALLPAPER: "خلفية",
    BANNER: "بانر",
    HOME_SECTION: "قسم الرئيسية",
    SETTINGS: "إعدادات",
  };
  return map[value] ?? value;
}

export function actionLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export function splitTags(value: string) {
  return value
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
) {
  const { api, qs } = await import("./api");
  const first = await api.get<{ data: T[]; meta: { totalPages: number } }>(
    `${path}${qs({ ...params, page: 1, limit: 100 })}`,
  );
  const items = [...first.data];
  const last = Math.min(first.meta.totalPages, 20);
  for (let page = 2; page <= last; page += 1) {
    const next = await api.get<{ data: T[] }>(`${path}${qs({ ...params, page, limit: 100 })}`);
    items.push(...next.data);
  }
  return items;
}
