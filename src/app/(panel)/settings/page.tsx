"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, fromLocalInput, toLocalInput } from "@/lib/format";
import type { Announcement, Data, ExtraLink, PlatformUpdate, SettingsDoc } from "@/lib/types";
import { useToast } from "@/components/feedback";
import { Alert, Button, Field, PageHeader } from "@/components/ui";

type FlagRow = { key: string; value: string };
type LinkRow = { label: string; url: string };

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function flagText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function parseFlag(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch { return text; }
  }
  return text;
}

function linkRows(links: ExtraLink[]): LinkRow[] {
  return links.map((link) => ({ label: link.label || link.title || "", url: link.url || link.href || "" }));
}

export default function SettingsPage() {
  const { admin } = useAuth();
  const toast = useToast();
  const canEdit = admin?.role === "SUPER_ADMIN";
  const [doc, setDoc] = useState<SettingsDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [maintenance, setMaintenance] = useState({ enabled: false, title: "", message: "", estimatedEndAt: "" });
  const [android, setAndroid] = useState<PlatformUpdate | null>(null);
  const [ios, setIos] = useState<PlatformUpdate | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [home, setHome] = useState({ bannersEnabled: true, defaultSectionLimit: 10 });
  const [downloads, setDownloads] = useState({ enabled: true, allowOriginalDownload: true, disabledMessage: "" });
  const [links, setLinks] = useState({ privacyPolicyUrl: "", termsOfServiceUrl: "", supportEmail: "", websiteUrl: "" });
  const [extraLinks, setExtraLinks] = useState<LinkRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);

  function hydrate(next: SettingsDoc) {
    const settings = next.settings;
    setDoc(next);
    setMaintenance({
      enabled: settings.maintenance.enabled,
      title: settings.maintenance.title ?? "",
      message: settings.maintenance.message ?? "",
      estimatedEndAt: toLocalInput(settings.maintenance.estimatedEndAt),
    });
    setAndroid(settings.appUpdate.android);
    setIos(settings.appUpdate.ios);
    setAnnouncements(settings.announcements ?? []);
    setHome(settings.home);
    setDownloads(settings.downloads);
    setLinks({
      privacyPolicyUrl: settings.externalLinks.privacyPolicyUrl ?? "",
      termsOfServiceUrl: settings.externalLinks.termsOfServiceUrl ?? "",
      supportEmail: settings.externalLinks.supportEmail ?? "",
      websiteUrl: settings.externalLinks.websiteUrl ?? "",
    });
    setExtraLinks(linkRows(settings.externalLinks.links ?? []));
    setFlags(Object.entries(settings.featureFlags ?? {}).map(([key, value]) => ({ key, value: flagText(value) })));
  }

  useEffect(() => {
    api.get<Data<SettingsDoc>>("/api/v1/admin/settings").then((res) => hydrate(res.data)).catch((err: unknown) => setError(errorText(err)));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!doc || !android || !ios) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.patch<Data<SettingsDoc>>("/api/v1/admin/settings", {
        expectedVersion: doc.version,
        maintenance: {
          enabled: maintenance.enabled,
          title: maintenance.title,
          message: maintenance.message,
          estimatedEndAt: fromLocalInput(maintenance.estimatedEndAt),
        },
        appUpdate: { android, ios },
        announcements,
        home,
        downloads,
        externalLinks: {
          privacyPolicyUrl: emptyToNull(links.privacyPolicyUrl),
          termsOfServiceUrl: emptyToNull(links.termsOfServiceUrl),
          supportEmail: emptyToNull(links.supportEmail),
          websiteUrl: emptyToNull(links.websiteUrl),
          links: extraLinks.filter((link) => link.url.trim()).map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
        },
        featureFlags: Object.fromEntries(flags.filter((flag) => flag.key.trim()).map((flag) => [flag.key.trim(), parseFlag(flag.value)])),
      });
      hydrate(res.data);
      toast.push("تم حفظ الإعدادات");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function updateAnnouncement(index: number, patch: Partial<Announcement>) {
    setAnnouncements((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  if (!android || !ios) {
    return (
      <div>
        <PageHeader title="الإعدادات" />
        {error ? <Alert>{error}</Alert> : <p className="muted">جاري التحميل…</p>}
      </div>
    );
  }

  return (
    <form onSubmit={save}>
      <PageHeader title="الإعدادات" hint={doc ? `الإصدار ${doc.version} · ${formatDate(doc.updatedAt)} · ${doc.updatedBy?.name ?? ""}` : ""}>
        {canEdit ? <Button type="submit" variant="primary" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ الإعدادات"}</Button> : null}
      </PageHeader>
      {!canEdit ? <div className="note">القراءة متاحة. التعديل لمدير النظام.</div> : null}
      {error ? <Alert>{error}</Alert> : null}
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="stack">
          <section className="card">
            <h2>الصيانة</h2>
            <div className="form-grid">
              <label className="toggle full"><input type="checkbox" checked={maintenance.enabled} onChange={(event) => setMaintenance({ ...maintenance, enabled: event.target.checked })} /> تفعيل وضع الصيانة</label>
              <Field label="العنوان"><input value={maintenance.title} onChange={(event) => setMaintenance({ ...maintenance, title: event.target.value })} /></Field>
              <Field label="موعد الانتهاء المتوقع"><input type="datetime-local" value={maintenance.estimatedEndAt} onChange={(event) => setMaintenance({ ...maintenance, estimatedEndAt: event.target.value })} /></Field>
              <Field label="الرسالة" className="full"><textarea value={maintenance.message} onChange={(event) => setMaintenance({ ...maintenance, message: event.target.value })} /></Field>
            </div>
          </section>

          <section className="card">
            <h2>تحديث التطبيق</h2>
            <div className="grid-2">
              <PlatformFields title="أندرويد" value={android} onChange={setAndroid} />
              <PlatformFields title="iOS" value={ios} onChange={setIos} />
            </div>
          </section>

          <section className="card">
            <h2>الصفحة الرئيسية والتنزيل</h2>
            <div className="form-grid">
              <label className="toggle"><input type="checkbox" checked={home.bannersEnabled} onChange={(event) => setHome({ ...home, bannersEnabled: event.target.checked })} /> إظهار البانرات</label>
              <Field label="حد القسم الافتراضي"><input type="number" min={1} max={50} value={home.defaultSectionLimit} onChange={(event) => setHome({ ...home, defaultSectionLimit: Number(event.target.value) || 1 })} /></Field>
              <label className="toggle"><input type="checkbox" checked={downloads.enabled} onChange={(event) => setDownloads({ ...downloads, enabled: event.target.checked })} /> التنزيل متاح</label>
              <label className="toggle"><input type="checkbox" checked={downloads.allowOriginalDownload} onChange={(event) => setDownloads({ ...downloads, allowOriginalDownload: event.target.checked })} /> السماح بالأصل</label>
              <Field label="رسالة إيقاف التنزيل" className="full"><input value={downloads.disabledMessage} onChange={(event) => setDownloads({ ...downloads, disabledMessage: event.target.value })} /></Field>
            </div>
          </section>

          <section className="card">
            <h2>الإعلانات</h2>
            <div className="stack">
              {announcements.map((item, index) => (
                <div key={`${item.id}-${index}`} className="form-grid" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <Field label="المعرّف"><input value={item.id} onChange={(event) => updateAnnouncement(index, { id: event.target.value })} /></Field>
                  <Field label="المستوى">
                    <select value={item.level} onChange={(event) => updateAnnouncement(index, { level: event.target.value })}>
                      {[item.level, "PROMO", "INFO", "WARNING"].filter((value, valueIndex, list) => list.indexOf(value) === valueIndex).map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="العنوان"><input value={item.title} onChange={(event) => updateAnnouncement(index, { title: event.target.value })} /></Field>
                  <Field label="رابط الإجراء"><input value={item.actionUrl ?? ""} onChange={(event) => updateAnnouncement(index, { actionUrl: emptyToNull(event.target.value) })} /></Field>
                  <Field label="الرسالة" className="full"><textarea value={item.message} onChange={(event) => updateAnnouncement(index, { message: event.target.value })} /></Field>
                  <label className="toggle"><input type="checkbox" checked={item.isActive} onChange={(event) => updateAnnouncement(index, { isActive: event.target.checked })} /> نشط</label>
                  <label className="toggle"><input type="checkbox" checked={item.dismissible} onChange={(event) => updateAnnouncement(index, { dismissible: event.target.checked })} /> قابل للإغلاق</label>
                  <Button type="button" variant="danger" className="small" onClick={() => setAnnouncements((current) => current.filter((_, itemIndex) => itemIndex !== index))}>حذف الإعلان</Button>
                </div>
              ))}
              <Button type="button" onClick={() => setAnnouncements((current) => [...current, { id: `ann-${Date.now()}`, title: "", message: "", level: "PROMO", actionUrl: null, dismissible: true, isActive: true, startsAt: null, endsAt: null }])}>إضافة إعلان</Button>
            </div>
          </section>

          <section className="card">
            <h2>الروابط</h2>
            <div className="form-grid">
              <Field label="سياسة الخصوصية"><input value={links.privacyPolicyUrl} onChange={(event) => setLinks({ ...links, privacyPolicyUrl: event.target.value })} /></Field>
              <Field label="شروط الاستخدام"><input value={links.termsOfServiceUrl} onChange={(event) => setLinks({ ...links, termsOfServiceUrl: event.target.value })} /></Field>
              <Field label="بريد الدعم"><input value={links.supportEmail} onChange={(event) => setLinks({ ...links, supportEmail: event.target.value })} /></Field>
              <Field label="الموقع"><input value={links.websiteUrl} onChange={(event) => setLinks({ ...links, websiteUrl: event.target.value })} /></Field>
            </div>
            <div className="stack" style={{ marginTop: 12 }}>
              {extraLinks.map((link, index) => (
                <div key={index} className="form-grid">
                  <Field label="العنوان"><input value={link.label} onChange={(event) => setExtraLinks((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} /></Field>
                  <Field label="الرابط"><input value={link.url} onChange={(event) => setExtraLinks((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row))} /></Field>
                </div>
              ))}
              <Button type="button" onClick={() => setExtraLinks((current) => [...current, { label: "", url: "" }])}>رابط إضافي</Button>
            </div>
          </section>

          <section className="card">
            <h2>أعلام الميزات</h2>
            <div className="stack">
              {flags.map((flag, index) => (
                <div key={index} className="form-grid">
                  <Field label="الاسم"><input value={flag.key} onChange={(event) => setFlags((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, key: event.target.value } : row))} /></Field>
                  <Field label="القيمة" hint="true أو false أو نص"><input value={flag.value} onChange={(event) => setFlags((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row))} /></Field>
                </div>
              ))}
              <Button type="button" onClick={() => setFlags((current) => [...current, { key: "", value: "true" }])}>علم جديد</Button>
            </div>
          </section>
        </div>
      </fieldset>
    </form>
  );
}

function PlatformFields({ title, value, onChange }: { title: string; value: PlatformUpdate; onChange: (value: PlatformUpdate) => void }) {
  return (
    <div className="stack">
      <h3 style={{ margin: 0 }}>{title}</h3>
      <Field label="أدنى إصدار مدعوم"><input value={value.minSupportedVersion} onChange={(event) => onChange({ ...value, minSupportedVersion: event.target.value })} /></Field>
      <Field label="أحدث إصدار"><input value={value.latestVersion} onChange={(event) => onChange({ ...value, latestVersion: event.target.value })} /></Field>
      <Field label="رسالة التحديث الإجباري"><textarea value={value.updateRequiredMessage} onChange={(event) => onChange({ ...value, updateRequiredMessage: event.target.value })} /></Field>
      <Field label="رسالة التحديث المتاح"><textarea value={value.updateAvailableMessage} onChange={(event) => onChange({ ...value, updateAvailableMessage: event.target.value })} /></Field>
      <Field label="رابط المتجر"><input value={value.storeUrl ?? ""} onChange={(event) => onChange({ ...value, storeUrl: event.target.value.trim() ? event.target.value : null })} /></Field>
    </div>
  );
}
