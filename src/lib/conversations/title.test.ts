import { describe, expect, it } from "vitest";
import { createConversationTitle } from "./title";

describe("createConversationTitle", () => {
  it("normalizes whitespace", () => {
    expect(createConversationTitle("  explain\n\nv1\tdeployments  ")).toBe(
      "explain v1 deployments",
    );
  });

  it("caps long titles", () => {
    const title = createConversationTitle("a".repeat(80));

    expect(title).toHaveLength(64);
    expect(title.endsWith("...")).toBe(true);
  });
});
