import { describe, expect, it } from "vitest";
import { buildTextDiff } from "@/app/lib/ai/diff";

describe("ai diff", () => {
  it("marks added and removed lines", () => {
    const diff = buildTextDiff("A\nB\nC", "A\nB2\nC\nD");
    expect(diff.some((chunk) => chunk.type === "removed")).toBe(true);
    expect(diff.some((chunk) => chunk.type === "added")).toBe(true);
  });

  it("keeps identical lines as same", () => {
    const diff = buildTextDiff("X\nY", "X\nY");
    expect(diff.every((chunk) => chunk.type === "same")).toBe(true);
  });

  it("captures trailing removed lines", () => {
    const diff = buildTextDiff("A\nB\nC", "A");
    expect(diff.filter((chunk) => chunk.type === "removed").length).toBeGreaterThan(0);
  });
});
