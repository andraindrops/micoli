import { readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

export type FileEntry = {
  path: string;
  type: "file" | "directory";
};

export function resolveWorkspacePath({
  root = process.cwd(),
  filePath = ".",
}: {
  filePath?: string;
  root?: string;
}): {
  hostPath: string;
  workspacePath: string;
} {
  const workspaceRoot = resolve(root);
  const hostPath = resolve(workspaceRoot, filePath);
  const relativePath = relative(workspaceRoot, hostPath);

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error("Path must stay inside the current working directory");
  }

  return {
    hostPath,
    workspacePath: relativePath || ".",
  };
}

export function joinRelativePath({
  basePath,
  entryPath,
}: {
  basePath: string;
  entryPath: string;
}): string {
  if (basePath === ".") {
    return entryPath;
  }

  return `${basePath}/${entryPath}`;
}

export async function spawnRipgrep(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const spawnedProcess = Bun.spawn(["rg", ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(spawnedProcess.stdout).text(),
    new Response(spawnedProcess.stderr).text(),
    spawnedProcess.exited,
  ]);

  return {
    stdout,
    stderr,
    exitCode,
  };
}

export async function collectFileEntries({
  basePath,
  currentPath,
  recursive = true,
}: {
  basePath: string;
  currentPath: string;
  recursive?: boolean;
}): Promise<FileEntry[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const results: FileEntry[] = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = joinRelativePath({ basePath, entryPath: entry.name });

    if (entry.isDirectory()) {
      results.push({ path, type: "directory" });
      if (!recursive) {
        continue;
      }

      results.push(
        ...(await collectFileEntries({
          basePath: path,
          currentPath: join(currentPath, entry.name),
          recursive,
        })),
      );
      continue;
    }

    if (entry.isFile()) {
      results.push({ path, type: "file" });
    }
  }

  return results;
}
