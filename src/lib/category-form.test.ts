import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryBody, canManageCategories, deletionMessage, deletionRequest, emptyTranslations } from "./category-form.ts";

test("category form stores one category with filled locales only", () => {
  const translations = emptyTranslations();
  translations.ar = { name: "طبيعة", description: "خلفيات طبيعية" };
  translations.tr = { name: "Doğa", description: "Doğa duvar kağıtları" };
  translations.en = { name: "Nature", description: "Nature wallpapers" };
  const body = buildCategoryBody({ slug: "nature", isPublished: true, sortOrder: 1, editing: true, translations });
  assert.equal(body.name, "Nature");
  assert.deepEqual(body.translations, [
    { locale: "ar", name: "طبيعة", description: "خلفيات طبيعية" },
    { locale: "tr", name: "Doğa", description: "Doğa duvar kağıtları" },
    { locale: "en", name: "Nature", description: "Nature wallpapers" },
  ]);
});

test("editing keeps an empty description and does not invent a missing language", () => {
  const translations = emptyTranslations();
  translations.ar = { name: "طبيعة", description: "" };
  const body = buildCategoryBody({ slug: "", isPublished: false, sortOrder: 0, editing: true, translations });
  assert.equal(body.name, "طبيعة");
  assert.equal(body.description, null);
  assert.deepEqual(body.translations, [{ locale: "ar", name: "طبيعة", description: null }]);
});

test("delete confirmation explains exclusive and shared wallpapers", () => {
  assert.match(deletionMessage("en", 24, 5, true), /24 exclusive wallpapers/);
  assert.match(deletionMessage("en", 24, 5, true), /5 wallpapers shared/);
  assert.match(deletionMessage("ar", 24, 5, true), /24/);
  assert.match(deletionMessage("tr", 24, 5, false), /korunur/);
});

test("exclusive wallpaper deletion is sent only after explicit confirmation", () => {
  assert.deepEqual(deletionRequest(false, true), { proceed: false, deleteExclusiveWallpapers: false });
  assert.deepEqual(deletionRequest(true, false), { proceed: true, deleteExclusiveWallpapers: false });
  assert.deepEqual(deletionRequest(true, true), { proceed: true, deleteExclusiveWallpapers: true });
});

test("category management requires an authenticated admin session", () => {
  assert.equal(canManageCategories("anonymous"), false);
  assert.equal(canManageCategories("loading"), false);
  assert.equal(canManageCategories("ready"), true);
});
