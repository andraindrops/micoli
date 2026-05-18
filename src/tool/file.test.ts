import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile as writeFsFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFile, findFiles, readFile, updateFile } from "./file";

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

describe("readFile", () => {
  it("reads only the requested line range", async () => {
    const workspace = await createWorkspace();
    await writeFsFile(
      join(workspace, "notes.txt"),
      ["line 1", "line 2", "line 3"].join("\n"),
      "utf8",
    );

    const result = await readFile({
      path: "notes.txt",
      beginLine: 1,
      closeLine: 2,
      root: workspace,
    });

    expect(result.totalLines).toBe(3);
    expect(result.beginLine).toBe(1);
    expect(result.closeLine).toBe(2);
    expect(result.content).toBe(["1|line 1", "2|line 2"].join("\n"));
  });
});

describe("createFile", () => {
  it("create a file", async () => {
    const workspace = await createWorkspace();

    await createFile({
      path: "nested/output.txt",
      content: "hello\nmiku!\n",
      root: workspace,
    });

    const saved = await readFile({
      path: "nested/output.txt",
      root: workspace,
    });

    expect(saved.content).toBe(["1|hello", "2|miku!"].join("\n"));
  });
});

describe("updateFile", () => {
  it("update a file", async () => {
    const workspace = await createWorkspace();

    await createFile({
      path: "nested/output.txt",
      content: "hello\nmiku!\n",
      root: workspace,
    });

    await updateFile({
      path: "nested/output.txt",
      oldString: "miku!",
      newString: "moku!",
      root: workspace,
    });

    const saved = await readFile({
      path: "nested/output.txt",
      root: workspace,
    });

    expect(saved.content).toBe(["1|hello", "2|moku!"].join("\n"));
  });

  it("throws when oldString is not found", async () => {
    const workspace = await createWorkspace();
    await writeFsFile(join(workspace, "draft.txt"), "hello world\n");

    await expect(
      updateFile({
        path: "draft.txt",
        oldString: "not found",
        newString: "replacement",
        root: workspace,
      }),
    ).rejects.toThrow("oldString not found in file");
  });

  it("throws when oldString matches multiple locations", async () => {
    const workspace = await createWorkspace();
    await writeFsFile(join(workspace, "draft.txt"), "hello\nhello\n");

    await expect(
      updateFile({
        path: "draft.txt",
        oldString: "hello",
        newString: "hollo",
        root: workspace,
      }),
    ).rejects.toThrow("oldString found 2 times");
  });
});

describe("findFiles", () => {
  it("finds matching lines in files", async () => {
    const workspace = await createWorkspace();
    await writeFsFile(
      join(workspace, "example1.ts"),
      "const foo = 1;\n",
      "utf8",
    );
    await writeFsFile(
      join(workspace, "example2.ts"),
      "const foo = 2;\n",
      "utf8",
    );

    const result = await findFiles({
      pattern: "foo",
      root: workspace,
    });

    expect(result.totalMatches).toBe(2);
    expect(result.matches).toEqual(
      expect.arrayContaining([
        { path: "example1.ts", line: 1, content: "const foo = 1;" },
        { path: "example2.ts", line: 1, content: "const foo = 2;" },
      ]),
    );
  });
});
