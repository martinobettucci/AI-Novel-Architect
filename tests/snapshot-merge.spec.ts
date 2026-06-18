import { describe, expect, it } from "vitest";
import {
  applyMerge,
  buildMergeSegments,
  htmlToBlocks,
} from "@/app/lib/snapshotMerge";

describe("htmlToBlocks", () => {
  it("splits block elements while keeping inline markup", () => {
    expect(htmlToBlocks("<p>Hello <strong>world</strong></p><p>Bye</p>")).toEqual([
      "<p>Hello <strong>world</strong></p>",
      "<p>Bye</p>",
    ]);
  });
});

describe("buildMergeSegments + applyMerge", () => {
  const snapshot = "<p>Intro</p><p>Old middle</p><p>Shared end</p>";
  const current = "<p>Intro</p><p>New middle</p><p>Shared end</p>";

  it("identifies shared blocks and a single change hunk", () => {
    const segments = buildMergeSegments(snapshot, current);
    const changes = segments.filter((s) => !s.same);
    expect(changes).toHaveLength(1);
    expect(changes[0].snapshotLines).toEqual(["<p>Old middle</p>"]);
    expect(changes[0].currentLines).toEqual(["<p>New middle</p>"]);
  });

  it("defaults to current and yields the current text", () => {
    const segments = buildMergeSegments(snapshot, current);
    expect(applyMerge(segments, {})).toBe(current);
  });

  it("restores the snapshot fragment when that hunk is chosen", () => {
    const segments = buildMergeSegments(snapshot, current);
    const changeId = segments.find((s) => !s.same)!.id;
    expect(applyMerge(segments, { [changeId]: "snapshot" })).toBe(snapshot);
  });

  it("can mix sides across multiple hunks", () => {
    const snap = "<p>a</p><p>b1</p><p>c</p><p>d1</p>";
    const curr = "<p>a</p><p>b2</p><p>c</p><p>d2</p>";
    const segments = buildMergeSegments(snap, curr);
    const changes = segments.filter((s) => !s.same);
    expect(changes).toHaveLength(2);
    // keep snapshot for the first hunk, current for the second
    const merged = applyMerge(segments, { [changes[0].id]: "snapshot", [changes[1].id]: "current" });
    expect(merged).toBe("<p>a</p><p>b1</p><p>c</p><p>d2</p>");
  });
});
