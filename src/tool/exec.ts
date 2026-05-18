import { resolveWorkspacePath } from "@/lib/file";

export async function tool({
  root = process.cwd(),
  path,
  command,
}: {
  root?: string;
  path?: string;
  command: string;
}): Promise<{
  blocked: boolean;
  command: string;
  path: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}> {
  const { hostPath, workspacePath } = resolveWorkspacePath({
    filePath: path,
    root,
  });

  const spawnedProcess = Bun.spawn(["sh", "-lc", command], {
    cwd: hostPath,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await spawnedProcess.exited;

  return {
    blocked: false,
    command,
    path: workspacePath,
    stdout: "",
    stderr: "",
    exitCode,
    success: exitCode === 0,
  };
}
