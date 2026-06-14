/**
 * File Tools Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, readFile as fsReadFile } from "node:fs/promises";
import {
  readFile,
  writeFile,
  createFile,
  deleteFile,
  applyPatch,
} from "./file.js";

describe("File Tools", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "anggor-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("readFile", () => {
    it("should read entire file", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "line1\nline2\nline3\n");

      const content = await readFile(path);
      expect(content).toBe("line1\nline2\nline3\n");
    });

    it("should read file with line range", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "line1\nline2\nline3\nline4\nline5\n");

      const content = await readFile(path, { lineStart: 2, lineEnd: 4 });
      expect(content).toBe("line2\nline3\nline4");
    });

    it("should throw error for non-existent file", async () => {
      await expect(readFile(join(tempDir, "nonexistent.txt"))).rejects.toThrow();
    });
  });

  describe("writeFile", () => {
    it("should write file", async () => {
      const path = join(tempDir, "test.txt");
      const result = await writeFile(path, "hello world");

      expect(result.path).toBe(path);
      expect(result.bytes).toBe(11);

      const content = await fsReadFile(path, "utf8");
      expect(content).toBe("hello world");
    });

    it("should create parent directories", async () => {
      const path = join(tempDir, "nested", "dir", "test.txt");
      await writeFile(path, "content");

      const content = await fsReadFile(path, "utf8");
      expect(content).toBe("content");
    });

    it("should overwrite existing file", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "original");
      await writeFile(path, "updated");

      const content = await fsReadFile(path, "utf8");
      expect(content).toBe("updated");
    });
  });

  describe("createFile", () => {
    it("should create new file", async () => {
      const path = join(tempDir, "new.txt");
      const result = await createFile(path, "content");

      expect(result.path).toBe(path);
      expect(result.bytes).toBe(7);

      const content = await fsReadFile(path, "utf8");
      expect(content).toBe("content");
    });

    it("should throw error if file exists", async () => {
      const path = join(tempDir, "existing.txt");
      await writeFile(path, "content");

      await expect(createFile(path, "new content")).rejects.toThrow("File already exists");
    });
  });

  describe("deleteFile", () => {
    it("should delete file (unsafe mode)", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "content");

      const result = await deleteFile(path, false);
      expect(result.safe).toBe(false);

      await expect(fsReadFile(path, "utf8")).rejects.toThrow();
    });

    it("should safe delete file (rename to .bak)", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "content");

      const result = await deleteFile(path, true);
      expect(result.safe).toBe(true);
      expect(result.backupPath).toBe(`${path}.bak`);

      // Original file should not exist
      await expect(fsReadFile(path, "utf8")).rejects.toThrow();

      // Backup should exist
      const backupContent = await fsReadFile(`${path}.bak`, "utf8");
      expect(backupContent).toBe("content");
    });

    it("should throw error for non-existent file", async () => {
      await expect(deleteFile(join(tempDir, "nonexistent.txt"))).rejects.toThrow("File not found");
    });
  });

  describe("applyPatch", () => {
    it("should apply simple patch", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "line1\nline2\nline3\nline4\nline5\n");

      const patch = `--- a/test.txt
+++ b/test.txt
@@ -2,3 +2,3 @@
 line2
-line3
+lineTHREE
 line4
`;

      const result = await applyPatch(path, patch);
      expect(result.path).toBe(path);

      const content = await fsReadFile(path, "utf8");
      expect(content).toContain("lineTHREE");
      expect(content).not.toContain("line3\n");
    });

    it("should throw error for invalid patch", async () => {
      const path = join(tempDir, "test.txt");
      await writeFile(path, "content");

      await expect(applyPatch(path, "invalid patch")).rejects.toThrow("No valid hunks found");
    });
  });
});
