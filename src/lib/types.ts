export type Role = "SUPER_ADMIN" | "EDITOR";

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthPayload = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  csrfToken: string;
  admin: AdminProfile;
};

export type AdminAccount = AdminProfile & {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Page<T> = { data: T[]; meta: PageMeta };
export type Data<T> = { data: T };

export type ImageRef = {
  mediaId: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  originalUrl: string | null;
};

export type MediaVariant = {
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
};

export type MediaItem = {
  id: string;
  originalFilename: string;
  original: MediaVariant;
  preview: MediaVariant;
  thumbnail: MediaVariant;
  usage: { wallpapers: number; categories: number; banners: number };
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  cover: ImageRef | null;
  wallpaperCount: number;
  publishedWallpaperCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WallpaperCategory = { id: string; name: string; slug: string };

export type Wallpaper = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  tags: string[];
  orientation: "PORTRAIT" | "LANDSCAPE" | "SQUARE";
  width: number;
  height: number;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  publishedAt: string | null;
  image: ImageRef;
  categories: WallpaperCategory[];
  stats: { views: number; downloadClicks: number; downloads: number };
  createdAt: string;
  updatedAt: string;
};

export type BannerAction = "NONE" | "OPEN_CATEGORY" | "OPEN_URL";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  actionType: BannerAction;
  actionValue: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  image: ImageRef;
  createdAt: string;
  updatedAt: string;
};

export type SectionType =
  | "BANNERS"
  | "FEATURED_WALLPAPERS"
  | "POPULAR_WALLPAPERS"
  | "LATEST_WALLPAPERS"
  | "CATEGORY_WALLPAPERS"
  | "CUSTOM_WALLPAPERS"
  | "CATEGORIES";

export type HomeSection = {
  id: string;
  title: string;
  sectionType: SectionType;
  sortOrder: number;
  isEnabled: boolean;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PlatformUpdate = {
  minSupportedVersion: string;
  latestVersion: string;
  updateRequiredMessage: string;
  updateAvailableMessage: string;
  storeUrl: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  level: string;
  actionUrl: string | null;
  dismissible: boolean;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type ExtraLink = { label?: string; title?: string; url?: string; href?: string };

export type SettingsDoc = {
  version: number;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
  settings: {
    maintenance: {
      enabled: boolean;
      title: string;
      message: string;
      estimatedEndAt: string | null;
    };
    appUpdate: { android: PlatformUpdate; ios: PlatformUpdate };
    announcements: Announcement[];
    home: { bannersEnabled: boolean; defaultSectionLimit: number };
    downloads: { enabled: boolean; allowOriginalDownload: boolean; disabledMessage: string };
    externalLinks: {
      privacyPolicyUrl: string | null;
      termsOfServiceUrl: string | null;
      supportEmail: string | null;
      websiteUrl: string | null;
      links: ExtraLink[];
    };
    featureFlags: Record<string, unknown>;
  };
};

export type DashboardOverview = {
  content: {
    wallpapers: { total: number; published: number; unpublished: number; featured: number };
    categories: { total: number; published: number };
    banners: { total: number; activeNow: number };
    mediaOriginals: number;
  };
  analytics: {
    today: MetricTriple;
    last7Days: MetricTriple;
    last30Days: MetricTriple;
  };
  topWallpapersLast7Days: unknown[];
};

export type MetricTriple = { views: number; downloadClicks: number; downloads: number };

export type RecentWallpaper = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
};

export type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: { id: string; name: string } | null;
};

export type StorageInfo = {
  provider: string;
  totalBytes: number;
  variants: Record<string, { count: number; bytes: number }>;
  unusedOriginals: number;
};

export type AnalyticsOverview = {
  range: { from: string; to: string };
  totals: MetricTriple;
  previousPeriod: { from: string; to: string } & MetricTriple;
  allTime: MetricTriple;
  series: ({ date: string } & MetricTriple)[];
};

export type DownloadAnalytics = {
  range: { from: string; to: string };
  totals: { downloadClicks: number; downloads: number; conversionRate: number };
  series: { date: string; downloadClicks: number; downloads: number; conversionRate: number }[];
  byPlatform: { platform: string; downloadClicks: number; downloads: number }[];
};

export type PopularWallpaper = {
  wallpaper: { id: string; title: string; slug: string; isPublished: boolean; thumbnailUrl: string | null };
  views: number;
  downloadClicks: number;
  downloads: number;
};

export type PopularCategory = {
  category: { id: string; name: string; slug: string };
  views: number;
  downloadClicks: number;
  downloads: number;
};

export type AuditLog = {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
};

export type BulkFileResult<T> = {
  succeeded: number;
  failed: number;
  results: {
    index: number;
    filename: string | null;
    status: "success" | "error";
    item?: T;
    error?: { statusCode: number; message: string };
  }[];
};

export const SECTION_TYPES: SectionType[] = [
  "BANNERS",
  "FEATURED_WALLPAPERS",
  "POPULAR_WALLPAPERS",
  "LATEST_WALLPAPERS",
  "CATEGORY_WALLPAPERS",
  "CUSTOM_WALLPAPERS",
  "CATEGORIES",
];

export const AUDIT_ACTIONS = [
  "AUTH_LOGIN",
  "AUTH_LOGIN_FAILED",
  "AUTH_ACCOUNT_LOCKED",
  "AUTH_LOGOUT",
  "AUTH_REFRESH_TOKEN_REUSE",
  "AUTH_PASSWORD_CHANGED",
  "ADMIN_CREATED",
  "ADMIN_UPDATED",
  "ADMIN_PASSWORD_RESET",
  "ADMIN_DELETED",
  "MEDIA_UPLOADED",
  "MEDIA_DELETED",
  "MEDIA_CLEANUP",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_PUBLISHED",
  "CATEGORY_UNPUBLISHED",
  "CATEGORY_REORDERED",
  "CATEGORY_DELETED",
  "WALLPAPER_CREATED",
  "WALLPAPER_UPDATED",
  "WALLPAPER_PUBLISHED",
  "WALLPAPER_UNPUBLISHED",
  "WALLPAPER_DELETED",
  "WALLPAPER_BULK_CREATED",
  "WALLPAPER_BULK_UPDATED",
  "BANNER_CREATED",
  "BANNER_UPDATED",
  "BANNER_DELETED",
  "BANNER_REORDERED",
  "HOME_SECTION_CREATED",
  "HOME_SECTION_UPDATED",
  "HOME_SECTION_DELETED",
  "HOME_SECTION_REORDERED",
  "SETTINGS_UPDATED",
] as const;

export const ENTITY_TYPES = [
  "AUTH",
  "ADMIN",
  "MEDIA",
  "CATEGORY",
  "WALLPAPER",
  "BANNER",
  "HOME_SECTION",
  "SETTINGS",
] as const;
