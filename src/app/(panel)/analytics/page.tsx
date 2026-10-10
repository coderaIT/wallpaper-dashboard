"use client";

import { useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/format";
import type { AnalyticsOverview, Data, DownloadAnalytics, PopularCategory, PopularWallpaper } from "@/lib/types";
import { Alert, PageHeader } from "@/components/ui";

type Metric = "views" | "downloadClicks" | "downloads";

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [metric, setMetric] = useState<Metric>("downloads");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [downloads, setDownloads] = useState<DownloadAnalytics | null>(null);
  const [wallpapers, setWallpapers] = useState<PopularWallpaper[]>([]);
  const [categories, setCategories] = useState<PopularCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const range = { from, to };
    setError(null);
    Promise.all([
      api.get<Data<AnalyticsOverview>>(`/api/v1/admin/analytics/overview${qs(range)}`),
      api.get<Data<DownloadAnalytics>>(`/api/v1/admin/analytics/downloads${qs(range)}`),
      api.get<Data<{ items: PopularWallpaper[] }>>(`/api/v1/admin/analytics/popular-wallpapers${qs({ ...range, metric, limit: 8 })}`),
      api.get<Data<{ items: PopularCategory[] }>>(`/api/v1/admin/analytics/popular-categories${qs({ ...range, metric, limit: 8 })}`),
    ])
      .then(([overviewRes, downloadsRes, wallpapersRes, categoriesRes]) => {
        if (cancelled) return;
        setOverview(overviewRes.data);
        setDownloads(downloadsRes.data);
        setWallpapers(wallpapersRes.data.items);
        setCategories(categoriesRes.data.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, metric]);

  const max = Math.max(1, ...(overview?.series.map((row) => Math.max(row.views, row.downloads)) ?? [1]));

  return (
    <div>
      <PageHeader title="التحليلات" hint="التواريخ بتوقيت UTC. الفراغ يعني آخر 30 يوماً." />
      <div className="toolbar">
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="من" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="إلى" />
        <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
          <option value="downloads">التنزيلات</option>
          <option value="downloadClicks">نقرات التنزيل</option>
          <option value="views">المشاهدات</option>
        </select>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {overview ? (
        <>
          <div className="stats">
            <div className="stat"><span>مشاهدات الفترة</span><b>{formatNumber(overview.totals.views)}</b><em>قبلها {formatNumber(overview.previousPeriod.views)}</em></div>
            <div className="stat"><span>نقرات التنزيل</span><b>{formatNumber(overview.totals.downloadClicks)}</b><em>قبلها {formatNumber(overview.previousPeriod.downloadClicks)}</em></div>
            <div className="stat"><span>تنزيلات الفترة</span><b>{formatNumber(overview.totals.downloads)}</b><em>قبلها {formatNumber(overview.previousPeriod.downloads)}</em></div>
            <div className="stat"><span>كل الأوقات</span><b>{formatNumber(overview.allTime.downloads)}</b><em>{formatNumber(overview.allTime.views)} مشاهدة</em></div>
          </div>
          <section className="card">
            <h2>{overview.range.from} — {overview.range.to}</h2>
            <div className="legend"><span><i style={{ background: "var(--accent)" }} /> مشاهدات</span><span><i style={{ background: "var(--good)" }} /> تنزيلات</span></div>
            <div className="bars">
              {overview.series.map((row) => (
                <div key={row.date} className="bar-col" title={`${row.date}: ${row.views} / ${row.downloads}`}>
                  <div className="bar views" style={{ height: `${(row.views / max) * 100}%` }} />
                  <div className="bar downloads" style={{ height: `${(row.downloads / max) * 100}%` }} />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
      <div className="grid-2" style={{ marginTop: 12 }}>
        <section className="card">
          <h2>التنزيلات حسب المنصة</h2>
          {downloads ? <p className="muted">التحويل {formatPercent(downloads.totals.conversionRate)}</p> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>المنصة</th><th>نقرات</th><th>تنزيلات</th></tr></thead>
              <tbody>
                {downloads?.byPlatform.map((row) => (
                  <tr key={row.platform}><td>{row.platform}</td><td>{formatNumber(row.downloadClicks)}</td><td>{formatNumber(row.downloads)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2>التصنيفات</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>التصنيف</th><th>القيمة</th></tr></thead>
              <tbody>
                {categories.map((row) => (
                  <tr key={row.category.id}><td>{row.category.name}</td><td>{formatNumber(row[metric])}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="card" style={{ marginTop: 12 }}>
        <h2>الخلفيات</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>العنوان</th><th>مشاهدات</th><th>نقرات</th><th>تنزيلات</th></tr></thead>
            <tbody>
              {wallpapers.map((row) => (
                <tr key={row.wallpaper.id}>
                  <td>{row.wallpaper.thumbnailUrl ? <img className="thumb" src={row.wallpaper.thumbnailUrl} alt="" /> : null}</td>
                  <td>{row.wallpaper.title}</td>
                  <td>{formatNumber(row.views)}</td>
                  <td>{formatNumber(row.downloadClicks)}</td>
                  <td>{formatNumber(row.downloads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
