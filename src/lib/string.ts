export function toLines({ content }: { content: string }): string[] {
  if (content === "") {
    return [];
  }

  const lines = content.split(/\r?\n/u);

  if (content.endsWith("\n") || content.endsWith("\r")) {
    lines.pop();
  }

  return lines;
}
