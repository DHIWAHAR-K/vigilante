import { describe, expect, it } from "vitest";
import { normalizeRedirectPath } from "./redirects";

describe("normalizeRedirectPath", () => {
  it("keeps safe relative paths", () => {
    expect(normalizeRedirectPath("/app?conversation=abc")).toBe(
      "/app?conversation=abc",
    );
  });

  it("falls back for empty or non-string values", () => {
    expect(normalizeRedirectPath("")).toBe("/app");
    expect(normalizeRedirectPath(null)).toBe("/app");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(normalizeRedirectPath("https://example.com")).toBe("/app");
    expect(normalizeRedirectPath("//example.com")).toBe("/app");
  });
});
