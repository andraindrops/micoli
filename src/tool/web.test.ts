import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { tool } from "./web";

afterEach(() => {
  mock.restore();
});

function mockFetch(response: Response) {
  spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("tool", () => {
  it("fetches a page and returns its content", async () => {
    mockFetch(
      new Response("hello world", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    const result = await tool({
      url: "https://example.com/hello",
    });

    expect(result.status).toBe(200);
    expect(result.content).toBe("hello world");
    expect(result.url).toBe("");
  });
});
