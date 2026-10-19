import assert from "node:assert/strict";
import test from "node:test";
import { chunkFilesForUpload, uploadFilesInBatches } from "./upload-batches.ts";

function file(name: string, size: number) {
  return { name, size };
}

test("chunks stay within the file count and byte budget", () => {
  const files = [
    file("a.jpg", 10),
    file("b.jpg", 10),
    file("c.jpg", 10),
    file("d.jpg", 25),
    file("e.jpg", 5),
    file("f.jpg", 5),
  ];
  const chunks = chunkFilesForUpload(files, 2, 20);
  assert.deepEqual(chunks.map((chunk) => chunk.map((item) => item.name)), [
    ["a.jpg", "b.jpg"],
    ["c.jpg"],
    ["d.jpg"],
    ["e.jpg", "f.jpg"],
  ]);
});

test("a selection larger than 50 is uploaded in several requests", async () => {
  const files = Array.from({ length: 55 }, (_, index) => file(`wall-${index}.jpg`, 1024));
  const seen: number[] = [];
  const summary = await uploadFilesInBatches({
    files,
    maxFiles: 8,
    maxBytes: 20 * 1024,
    upload: async (batch) => {
      seen.push(batch.length);
      return {
        succeeded: batch.length,
        failed: 0,
        results: batch.map((item, index) => ({ index, filename: item.name, status: "success" as const })),
      };
    },
  });
  assert.equal(summary.succeeded, 55);
  assert.equal(summary.failed, 0);
  assert.ok(seen.every((count) => count <= 8));
  assert.equal(seen.reduce((sum, count) => sum + count, 0), 55);
  assert.deepEqual(summary.results.map((row) => row.index), files.map((_, index) => index));
});

test("a rejected batch is retried one file at a time", async () => {
  const files = [file("a.jpg", 100), file("b.jpg", 100), file("huge.jpg", 100)];
  const calls: string[][] = [];
  const summary = await uploadFilesInBatches({
    files,
    maxFiles: 8,
    maxBytes: 1024,
    upload: async (batch) => {
      calls.push(batch.map((item) => item.name));
      if (batch.length > 1) {
        const error = new Error("Too many files");
        (error as Error & { status: number }).status = 400;
        throw error;
      }
      if (batch[0].name === "huge.jpg") {
        const error = new Error("File too large");
        (error as Error & { status: number }).status = 413;
        throw error;
      }
      return { succeeded: 1, failed: 0, results: [{ index: 0, filename: batch[0].name, status: "success" }] };
    },
  });
  assert.deepEqual(calls, [["a.jpg", "b.jpg", "huge.jpg"], ["a.jpg"], ["b.jpg"], ["huge.jpg"]]);
  assert.equal(summary.succeeded, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.results[2].error?.message, "File too large");
});

test("a timeout is not retried, so files are not uploaded twice", async () => {
  const files = [file("a.jpg", 10), file("b.jpg", 10)];
  let calls = 0;
  const summary = await uploadFilesInBatches({
    files,
    maxFiles: 8,
    maxBytes: 1024,
    upload: async () => {
      calls += 1;
      throw new Error("network");
    },
  });
  assert.equal(calls, 1);
  assert.equal(summary.failed, 2);
  assert.equal(summary.succeeded, 0);
});
