"use client";

import { useEffect, useState } from "react";
import { api, errorText, qs } from "@/lib/api";
import type { MediaItem, Page } from "@/lib/types";
import { Alert, Button, Empty, Modal, Pagination } from "./ui";

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    api
      .get<Page<MediaItem>>(`/api/v1/admin/media${qs({ page, limit: 12, search })}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, search]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await api.upload<{ data: MediaItem }>("/api/v1/admin/media", form);
      onSelect(res.data);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} title="اختيار صورة" onClose={onClose} wide>
      <div className="toolbar">
        <input
          className="input"
          placeholder="بحث باسم الملف"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <label className="btn primary">
          {uploading ? "جاري الرفع…" : "رفع صورة"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <Empty title="لا توجد وسائط" hint="ارفع JPEG أو PNG أو WebP." /> : null}
      <div className="media-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="media-card"
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            style={{ textAlign: "start", padding: 0 }}
          >
            <div className="frame">
              <img src={item.thumbnail.url} alt={item.originalFilename} />
            </div>
            <div className="media-meta">
              <strong>{item.originalFilename}</strong>
              <span className="muted">{item.original.width}×{item.original.height}</span>
            </div>
          </button>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      <div style={{ height: 8 }} />
      <Button type="button" onClick={onClose}>إغلاق</Button>
    </Modal>
  );
}
