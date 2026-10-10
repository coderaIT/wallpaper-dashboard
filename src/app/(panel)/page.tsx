"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { actionLabel, formatBytes, formatNumber } from "@/lib/format";
import type { ActivityItem, DashboardOverview, Data, RecentWallpaper, SettingsDoc, StorageInfo } from "@/lib/types";
import { Alert, Badge, PageHeader } from "@/components/ui";

function readTop(item: unknown) {
  const row = item as {
    wallpaper?: { id?: string; title?: string; thumbnailUrl?: string | null };
    id?: string;
    title?: string;
    thumbnailUrl?: string | null;
    downloads?: number;
    views?: number;
  };
  const wallpaper = row.wallpaper;
  return {
    id: wallpaper?.id ?? row.id ?? "",
    title: wallpaper?.title ?? row.title ?? "خلفية",
    thumb: wallpaper?.thumbnailUrl ?? row.thumbnailUrl ?? null,
    downloads: row.downloads,
    views: row.views,
  };
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recent, setRecent] = useState<RecentWallpaper[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api.get<Data<DashboardOverview>>("/api/v1/admin/dashboard/overview"),
      api.get<Data<RecentWallpaper[]>>("/api/v1/admin/dashboard/recent-wallpapers?limit=8"),
      api.get<Data<StorageInfo>>("/api/v1/admin/dashboard/storage"),
      api.get<Data<ActivityItem[]>>("/api/v1/admin/dashboard/recent-activity?limit=8"),
      api.get<Data<SettingsDoc>>("/api/v1/admin/settings"),
    ]).then(([overviewRes, recentRes, storageRes, activityRes, settingsRes]) => {
      if (cancelled) return;
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.data);
      else setError(errorText(overviewRes.reason));
      if (recentRes.status === "fulfilled") setRecent(recentRes.value.data);
      if (storageRes.status === "fulfilled") setStorage(storageRes.value.data);
      if (activityRes.status === "fulfilled") setActivity(activityRes.value.data);
      if (settingsRes.status === "fulfilled") setMaintenance(settingsRes.value.data.settings.maintenance.enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const storageTotal = storage?.totalBytes || 1;
  const storageParts = storage
    ? ["ORIGINAL", "PREVIEW", "THUMBNAIL"].map((key) => ({
        key,
        bytes: storage.variants[key]?.bytes ?? 0,
      }))
    : [];

  return (
    <div>
      <PageHeader title="الرئيسية" hint="ملخص المحتوى والنشاط خلال اليوم والأسبوع والشهر." />
      {maintenance ? <div className="note">وضع الصيانة مفعّل في التطبيق.</div> : null}
      {error ? <Alert>{error}</Alert> : null}
      {overview ? (
        <>
          <div className="stats">
            <div className="stat">
              <span>الخلفيات</span>
              <b>{formatNumber(overview.content.wallpapers.total)}</b>
              <em>{formatNumber(overview.content.wallpapers.published)} منشورة · {formatNumber(overview.content.wallpapers.featured)} مميزة</em>
            </div>
            <div className="stat">
              <span>التصنيفات</span>
              <b>{formatNumber(overview.content.categories.total)}</b>
              <em>{formatNumber(overview.content.categories.published)} منشورة</em>
            </div>
            <div className="stat">
              <span>البانرات</span>
              <b>{formatNumber(overview.content.banners.total)}</b>
              <em>{formatNumber(overview.content.banners.activeNow)} ظاهرة الآن</em>
            </div>
            <div className="stat">
              <span>ملفات أصلية</span>
              <b>{formatNumber(overview.content.mediaOriginals)}</b>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <span>اليوم</span>
              <b>{formatNumber(overview.analytics.today.downloads)}</b>
              <em>{formatNumber(overview.analytics.today.views)} مشاهدة</em>
            </div>
            <div className="stat">
              <span>7 أيام</span>
              <b>{formatNumber(overview.analytics.last7Days.downloads)}</b>
              <em>{formatNumber(overview.analytics.last7Days.views)} مشاهدة</em>
            </div>
            <div className="stat">
              <span>30 يوماً</span>
              <b>{formatNumber(overview.analytics.last30Days.downloads)}</b>
              <em>{formatNumber(overview.analytics.last30Days.views)} مشاهدة</em>
            </div>
            <div className="stat">
              <span>نقرات التنزيل · 30 يوماً</span>
              <b>{formatNumber(overview.analytics.last30Days.downloadClicks)}</b>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid-2">
        <section className="card">
          <h2>أحدث الخلفيات</h2>
          {recent.length === 0 ? <p className="muted">لا توجد خلفيات بعد.</p> : null}
          <div className="recent">
            {recent.map((item) => (
              <Link key={item.id} href="/wallpapers">
                <div className="frame">
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} /> : null}
                </div>
                <span>{item.title}</span>
                <Badge tone={item.isPublished ? "on" : "off"}>{item.isPublished ? "منشورة" : "مسودة"}</Badge>
              </Link>
            ))}
          </div>
          {overview && overview.topWallpapersLast7Days.length > 0 ? (
            <>
              <h2 style={{ marginTop: 18 }}>الأعلى خلال 7 أيام</h2>
              <div className="recent">
                {overview.topWallpapersLast7Days.slice(0, 8).map((item, index) => {
                  const row = readTop(item);
                  return (
                    <div key={row.id || index}>
                      <div className="frame">{row.thumb ? <img src={row.thumb} alt="" /> : null}</div>
                      <span>{row.title}</span>
                      <span className="muted">
                        {row.downloads != null ? `${formatNumber(row.downloads)} تنزيل` : null}
                        {row.views != null ? ` · ${formatNumber(row.views)} مشاهدة` : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
        <div className="stack">
          <section className="card">
            <h2>التخزين</h2>
            {storage ? (
              <>
                <b className="mono">{formatBytes(storage.totalBytes)}</b>
                <p className="muted">{storage.provider} · {formatNumber(storage.unusedOriginals)} أصل غير مستخدم</p>
                <div className="storage-line" style={{ margin: "10px 0" }}>
                  {storageParts.map((part) => (
                    <span key={part.key} style={{ width: `${(part.bytes / storageTotal) * 100}%` }} />
                  ))}
                </div>
                {storageParts.map((part) => (
                  <div key={part.key} className="meta-row" style={{ justifyContent: "space-between" }}>
                    <span className="muted">{part.key}</span>
                    <span>{formatBytes(part.bytes)}</span>
                  </div>
                ))}
              </>
            ) : <p className="muted">تعذر قراءة التخزين.</p>}
          </section>
          {activity ? (
            <section className="card">
              <h2>آخر النشاط</h2>
              <div className="activity">
                {activity.length === 0 ? <p className="muted">لا يوجد نشاط.</p> : null}
                {activity.map((item) => (
                  <div key={item.id}>
                    <b>{actionLabel(item.action)}</b>
                    <span className="muted">{item.admin?.name ?? "النظام"} · {new Date(item.createdAt).toLocaleString("ar")}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
