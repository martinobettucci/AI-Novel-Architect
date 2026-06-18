import { buildTextDiff } from "@/app/lib/ai/diff";

const BLOCK_CLOSE = /<\/(p|h[1-6]|blockquote|pre|li|ul|ol|div)>/gi;

/**
 * Split rich-text HTML into block-level units (paragraphs, headings, list
 * items, …) so versions can be diffed and merged at a readable granularity
 * while preserving inline markup inside each block.
 */
export function htmlToBlocks(html: string): string[] {
  return html
    .replace(BLOCK_CLOSE, (match) => `${match}\n`)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function blocksToHtml(blocks: string[]): string {
  return blocks.join("");
}

export interface MergeSegment {
  id: number;
  /** True when both versions agree on this block. */
  same: boolean;
  /** Blocks present in this segment (for `same`, the shared blocks). */
  lines: string[];
  /** For a change: blocks from the snapshot version (removed from current). */
  snapshotLines: string[];
  /** For a change: blocks from the current version (added since the snapshot). */
  currentLines: string[];
}

/**
 * Build a hunk-based comparison of two HTML versions. `same` segments are shared
 * blocks; `change` segments expose the snapshot-side and current-side blocks so
 * the author can keep either side per hunk.
 */
export function buildMergeSegments(snapshotHtml: string, currentHtml: string): MergeSegment[] {
  const diff = buildTextDiff(htmlToBlocks(snapshotHtml).join("\n"), htmlToBlocks(currentHtml).join("\n"));

  const segments: MergeSegment[] = [];
  let id = 0;
  let i = 0;

  while (i < diff.length) {
    const chunk = diff[i];
    if (chunk.type === "same") {
      const lines: string[] = [];
      while (i < diff.length && diff[i].type === "same") {
        lines.push(diff[i].text);
        i += 1;
      }
      segments.push({ id: id++, same: true, lines, snapshotLines: [], currentLines: [] });
      continue;
    }

    const snapshotLines: string[] = [];
    const currentLines: string[] = [];
    while (i < diff.length && diff[i].type !== "same") {
      if (diff[i].type === "removed") snapshotLines.push(diff[i].text);
      else currentLines.push(diff[i].text);
      i += 1;
    }
    segments.push({ id: id++, same: false, lines: [], snapshotLines, currentLines });
  }

  return segments;
}

export type MergeChoice = "snapshot" | "current";

/**
 * Reconstruct HTML by taking shared blocks plus, for each change segment, the
 * chosen side. Defaults to the current side for any unspecified choice.
 */
export function applyMerge(
  segments: MergeSegment[],
  choices: Record<number, MergeChoice>
): string {
  const blocks: string[] = [];
  for (const segment of segments) {
    if (segment.same) {
      blocks.push(...segment.lines);
    } else {
      const side = choices[segment.id] ?? "current";
      blocks.push(...(side === "snapshot" ? segment.snapshotLines : segment.currentLines));
    }
  }
  return blocksToHtml(blocks);
}
