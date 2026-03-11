export type DiffChunkType = "same" | "added" | "removed";

export interface DiffChunk {
  type: DiffChunkType;
  text: string;
}

function asLines(input: string): string[] {
  return input.replace(/\r\n/g, "\n").split("\n");
}

// Line-level LCS diff for predictable preview apply in the UI.
export function buildTextDiff(original: string, updated: string): DiffChunk[] {
  const a = asLines(original);
  const b = asLines(updated);

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const chunks: DiffChunk[] = [];

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      chunks.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      chunks.push({ type: "removed", text: a[i] });
      i += 1;
    } else {
      chunks.push({ type: "added", text: b[j] });
      j += 1;
    }
  }

  while (i < a.length) {
    chunks.push({ type: "removed", text: a[i] });
    i += 1;
  }

  while (j < b.length) {
    chunks.push({ type: "added", text: b[j] });
    j += 1;
  }

  return chunks;
}
