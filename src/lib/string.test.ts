import { describe, expect, it } from "bun:test";

import { toLines } from "./string";

describe("toLines", () => {
  it("can split text into lines", () => {
    expect(toLines({ content: "line 1\nline 2\nline 3" })).toEqual([
      "line 1",
      "line 2",
      "line 3",
    ]);
  });
});
