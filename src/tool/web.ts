export async function tool({
  url,
  headers,
}: {
  url: string;
  headers?: Record<string, string>;
}): Promise<{
  url: string;
  status: number;
  content: string;
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "micoli/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain,application/json",
      ...headers,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });

  const content = await response.text();

  return {
    url: response.url,
    status: response.status,
    content,
  };
}
