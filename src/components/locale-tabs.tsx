"use client";

import { LocaleCode, useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";
import { useState } from "react";

export function LocaleTabs({ value, onChange }: { value: LocaleCode; onChange: (locale: LocaleCode) => void }) {
  const { t } = useI18n();
  const locales: LocaleCode[] = ["ar", "tr", "en"];
  return (
    <div className="locale-tabs" role="tablist" aria-label={t("lang.label")}>
      {locales.map((locale) => (
        <button key={locale} type="button" role="tab" aria-selected={value === locale} className={value === locale ? "active" : ""} onClick={() => onChange(locale)}>
          {t(`lang.${locale}`)}
        </button>
      ))}
    </div>
  );
}

export function LocalizedFields({
  value,
  onChange,
  primary,
  secondary,
}: {
  value: Record<LocaleCode, { name: string; description: string }>;
  onChange: (value: Record<LocaleCode, { name: string; description: string }>) => void;
  primary: string;
  secondary?: string;
}) {
  const [tab, setTab] = useState<LocaleCode>("en");
  const current = value[tab];
  return (
    <>
      <LocaleTabs value={tab} onChange={setTab} />
      <Field label={primary}>
        <input
          value={current.name}
          onChange={(event) => onChange({ ...value, [tab]: { ...current, name: event.target.value } })}
        />
      </Field>
      {secondary ? (
        <Field label={secondary}>
          <textarea
            value={current.description}
            onChange={(event) =>
              onChange({ ...value, [tab]: { ...current, description: event.target.value } })
            }
          />
        </Field>
      ) : null}
    </>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="lang-switch">
      <span>{t("lang.label")}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as LocaleCode)} aria-label={t("lang.label")}>
        <option value="ar">{t("lang.ar")}</option>
        <option value="tr">{t("lang.tr")}</option>
        <option value="en">{t("lang.en")}</option>
      </select>
    </label>
  );
}
