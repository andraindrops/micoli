import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { tool } from "./exec";

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

describe("tool", () => {
  it("runs the exec tool", async () => {
    const workspace = await createWorkspace();

    const result = await tool({
      root: workspace,
      command: "echo 'hello world'",
    });

    expect(result).toMatchObject({
      blocked: false,
      exitCode: 0,
      path: ".",
      success: true,
    });
  });
});
