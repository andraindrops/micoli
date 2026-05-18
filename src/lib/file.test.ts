import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectFileEntries,
  joinRelativePath,
  resolveWorkspacePath,
  spawnRipgrep,
} from "./file";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "tmp-workspace-"));
  tempDirectories.push(directory);
  return directory;
}

describe("resolveWorkspacePath", () => {
  it("can [   ] use path the workspace", async () => {
    const workspace = await createWorkspace();

    expect(
      resolveWorkspacePath({
        filePath: "nested/file.txt",
        root: workspace,
      }),
    ).toEqual({
      hostPath: join(workspace, "nested/file.txt"),
      workspacePath: "nested/file.txt",
    });
    expect(
      resolveWorkspacePath({
        root: workspace,
      }),
    ).toEqual({
      hostPath: workspace,
      workspacePath: ".",
    });
  });

  it("can [not] use path the workspace", async () => {
    const workspace = await createWorkspace();

    expect(() =>
      resolveWorkspacePath({
        filePath: "..",
        root: workspace,
      }),
    ).toThrow("Path must stay inside the current working directory");

    expect(() =>
      resolveWorkspacePath({
        filePath: join(workspace, ".."),
        root: workspace,
      }),
    ).toThrow("Path must stay inside the current working directory");
  });
});

describe("joinRelativePath", () => {
  it("joins paths under the workspace root", () => {
    expect(
      joinRelativePath({
        basePath: ".",
        entryPath: "README.md",
      }),
    ).toBe("README.md");
  });

  it("joins paths under a nested directory", () => {
    expect(
      joinRelativePath({
        basePath: "docs",
        entryPath: "guide.md",
      }),
    ).toBe("docs/guide.md");
  });
});

describe("spawnRipgrep", () => {
  it("can [   ] find files", async () => {
    const workspace = await createWorkspace();
    await writeFile(join(workspace, "notes.txt"), "hello\nworld\n", "utf8");

    const result = await spawnRipgrep([
      "--no-heading",
      "--line-number",
      "--color",
      "never",
      "--",
      "hello",
      workspace,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("notes.txt:1:hello");
  });

  it("can [not] find files", async () => {
    const workspace = await createWorkspace();
    await writeFile(join(workspace, "notes.txt"), "hello\nworld\n", "utf8");

    const result = await spawnRipgrep([
      "--no-heading",
      "--line-number",
      "--color",
      "never",
      "--",
      "missing",
      workspace,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
  });
});

describe("collectFileEntries", () => {
  it("can [   ] collect file entries", async () => {
    const workspace = await createWorkspace();
    await mkdir(join(workspace, "docs", "nested"), { recursive: true });
    await writeFile(join(workspace, "README.md"), "# hello\n", "utf8");
    await writeFile(join(workspace, "docs", "guide.md"), "guide\n", "utf8");
    await writeFile(join(workspace, "docs", "nested", "deep.md"), "deep\n");

    await expect(
      collectFileEntries({
        basePath: ".",
        currentPath: workspace,
      }),
    ).resolves.toEqual([
      { path: "docs", type: "directory" },
      { path: "docs/guide.md", type: "file" },
      { path: "docs/nested", type: "directory" },
      { path: "docs/nested/deep.md", type: "file" },
      { path: "README.md", type: "file" },
    ]);
  });

  it("can [not] collect nested file entries when recursive is false", async () => {
    const workspace = await createWorkspace();
    await mkdir(join(workspace, "docs"), { recursive: true });
    await writeFile(join(workspace, "docs", "guide.md"), "guide\n", "utf8");

    await expect(
      collectFileEntries({
        basePath: ".",
        currentPath: workspace,
        recursive: false,
      }),
    ).resolves.toEqual([{ path: "docs", type: "directory" }]);
  });
});
