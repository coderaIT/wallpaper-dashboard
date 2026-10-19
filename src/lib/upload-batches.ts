export const UPLOAD_BATCH_MAX_FILES = 8;
export const UPLOAD_BATCH_MAX_BYTES = 22 * 1024 * 1024;

export type BulkFileOutcome<T> = {
  index: number;
  filename: string | null;
  status: "success" | "error";
  item?: T;
  error?: { statusCode: number; message: string };
};

export type BulkFileSummary<T> = {
  succeeded: number;
  failed: number;
  results: BulkFileOutcome<T>[];
};

type UploadFile = { name: string; size: number };

/** Groups files so one request stays under the file-count and body-size caps. */
export function chunkFilesForUpload<T extends { size: number }>(
  files: readonly T[],
  maxFiles = UPLOAD_BATCH_MAX_FILES,
  maxBytes = UPLOAD_BATCH_MAX_BYTES,
): T[][] {
  if (maxFiles < 1) throw new Error("maxFiles must be at least 1");
  if (maxBytes < 1) throw new Error("maxBytes must be at least 1");
  const chunks: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const file of files) {
    const overflows =
      current.length > 0 &&
      (current.length >= maxFiles || bytes + file.size > maxBytes);
    if (overflows) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function mergeBulkResults<T>(
  parts: readonly BulkFileSummary<T>[],
): BulkFileSummary<T> {
  const results: BulkFileOutcome<T>[] = [];
  for (const part of parts) {
    for (const row of part.results)
      results.push({ ...row, index: results.length });
  }
  const failed = results.filter((row) => row.status === "error").length;
  return { succeeded: results.length - failed, failed, results };
}

function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

function failedFile<T>(
  file: UploadFile,
  message: string,
  statusCode = 0,
): BulkFileSummary<T> {
  return {
    succeeded: 0,
    failed: 1,
    results: [
      {
        index: 0,
        filename: file.name,
        status: "error",
        error: { statusCode, message },
      },
    ],
  };
}

function failedChunk<T>(
  files: readonly UploadFile[],
  message: string,
  statusCode = 0,
): BulkFileSummary<T> {
  return mergeBulkResults(
    files.map((file) => failedFile<T>(file, message, statusCode)),
  );
}

/**
 * Uploads every selected file. Requests are split so a selection larger than the
 * server file cap (and the proxy body cap) still completes as one action.
 * A rejected batch is retried one file at a time only when the server refused
 * the body before processing (400/413), so a timeout cannot create duplicates.
 */
export async function uploadFilesInBatches<
  TFile extends UploadFile,
  TItem,
>(options: {
  files: readonly TFile[];
  upload: (batch: TFile[]) => Promise<BulkFileSummary<TItem>>;
  onProgress?: (done: number, total: number) => void;
  messageOf?: (error: unknown) => string;
  maxFiles?: number;
  maxBytes?: number;
}): Promise<BulkFileSummary<TItem>> {
  const describe =
    options.messageOf ??
    ((error: unknown) =>
      error instanceof Error ? error.message : "تعذر رفع الملف");
  const total = options.files.length;
  let done = 0;
  const report = () => options.onProgress?.(done, total);
  report();

  async function send(batch: TFile[]): Promise<BulkFileSummary<TItem>> {
    try {
      const result = await options.upload(batch);
      done += batch.length;
      report();
      return result;
    } catch (error) {
      const status = statusOf(error);
      if (batch.length > 1 && (status === 400 || status === 413)) {
        const parts: BulkFileSummary<TItem>[] = [];
        for (const file of batch) parts.push(await send([file]));
        return mergeBulkResults(parts);
      }
      done += batch.length;
      report();
      return batch.length > 1
        ? failedChunk(batch, describe(error), status ?? 0)
        : failedFile(batch[0], describe(error), status ?? 0);
    }
  }

  const parts: BulkFileSummary<TItem>[] = [];
  for (const chunk of chunkFilesForUpload(
    options.files,
    options.maxFiles,
    options.maxBytes,
  )) {
    parts.push(await send(chunk));
  }
  return mergeBulkResults(parts);
}
