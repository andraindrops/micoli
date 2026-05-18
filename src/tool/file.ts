import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  mkdir,
} from "node:fs/promises";
import { dirname } from "node:path";

import {
  collectFileEntries,
  type FileEntry,
  resolveWorkspacePath,
  spawnRipgrep,
} from "@/lib/file";
import { toLines } from "@/lib/string";

export async function listFiles({
  root = process.cwd(),
  path = ".",
  recursive = true,
}: {
  root?: string;
  path?: string;
  recursive?: boolean;
} = {}): Promise<{
  path: string;
  recursive: boolean;
  entries: FileEntry[];
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  const entries = await collectFileEntries({
    basePath: workspacePath,
    currentPath: hostPath,
    recursive,
  });

  return {
    path: workspacePath,
    recursive,
    entries,
  };
}

export async function findFiles({
  root = process.cwd(),
  path = ".",
  pattern,
  glob,
  ignoreCase = false,
}: {
  root?: string;
  path?: string;
  pattern: string;
  glob?: string;
  ignoreCase?: boolean;
}): Promise<{
  path: string;
  pattern: string;
  totalMatches: number;
  matches: {
    path: string;
    line: number;
    content: string;
  }[];
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  const args = [
    "--no-heading",
    "--line-number",
    "--color",
    "never",
    ...(ignoreCase ? ["--ignore-case"] : []),
    ...(glob ? ["--glob", glob] : []),
    "--",
    pattern,
    hostPath,
  ];

  const { stdout, exitCode } = await spawnRipgrep(args);

  const matches: {
    path: string;
    line: number;
    content: string;
  }[] = [];

  if (exitCode === 0 && stdout !== "") {
    for (const line of stdout.split("\n")) {
      if (line === "") continue;

      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match == null) continue;

      matches.push({
        path: resolveWorkspacePath({
          filePath: match[1] as string,
          root,
        }).workspacePath,
        line: Number(match[2]),
        content: match[3] as string,
      });
    }
  }

  return {
    pattern,
    path: workspacePath,
    totalMatches: matches.length,
    matches,
  };
}

export async function readFile({
  root = process.cwd(),
  path,
  beginLine = 1,
  closeLine,
}: {
  root?: string;
  path: string;
  beginLine?: number;
  closeLine?: number;
}): Promise<{
  path: string;
  totalLines: number;
  beginLine: number;
  closeLine: number;
  content: string;
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  const text = await fsReadFile(hostPath, "utf8");

  const lines = toLines({ content: text });
  const totalLines = lines.length;

  let resultBeginLine = beginLine;
  let resultCloseLine = Math.min(closeLine ?? totalLines, totalLines);

  let selectedLines = lines.slice(
    Math.max(resultBeginLine - 1, 0),
    resultCloseLine,
  );

  if (totalLines === 0) {
    resultBeginLine = 0;
    resultCloseLine = 0;
    selectedLines = [];
  }

  return {
    path: workspacePath,
    totalLines,
    beginLine: resultBeginLine,
    closeLine: resultCloseLine,
    content: selectedLines
      .map((line, index) => `${resultBeginLine + index}|${line}`)
      .join("\n"),
  };
}

export async function createFile({
  root = process.cwd(),
  path,
  content,
}: {
  root?: string;
  path: string;
  content: string;
}): Promise<{
  path: string;
  bytesWritten: number;
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  await mkdir(dirname(hostPath), { recursive: true });
  await fsWriteFile(hostPath, content, "utf8");

  return {
    path: workspacePath,
    bytesWritten: Buffer.byteLength(content, "utf8"),
  };
}

export async function updateFile({
  root = process.cwd(),
  path,
  oldString,
  newString,
}: {
  root?: string;
  path: string;
  oldString: string;
  newString: string;
}): Promise<{
  path: string;
  bytesWritten: number;
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  const current = await fsReadFile(hostPath, "utf8");
  const count = current.split(oldString).length - 1;

  if (count === 0) {
    throw new Error("oldString not found in file");
  }

  if (count > 1) {
    throw new Error(
      `oldString found ${count} times in file, provide more context to make it unique`,
    );
  }

  const writeContent = current.replace(oldString, newString);

  await fsWriteFile(hostPath, writeContent, "utf8");

  return {
    path: workspacePath,
    bytesWritten: Buffer.byteLength(writeContent, "utf8"),
  };
}
