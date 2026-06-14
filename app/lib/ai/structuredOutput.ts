export type JsonSchema = Record<string, unknown>;

export interface AiResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JsonSchema;
  };
}

export function createJsonResponseFormat(
  name: string,
  schema: JsonSchema
): AiResponseFormat {
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema,
    },
  };
}

function stripThinkingAndFences(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function findJsonEnd(text: string, start: number): number {
  const opening = text[start];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let escaped = false;
  let inString = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === opening) depth += 1;
    if (character === closing) depth -= 1;
    if (depth === 0) return index + 1;
  }

  return -1;
}

export function parseStructuredJson(text: string): unknown | null {
  const normalized = stripThinkingAndFences(text);

  try {
    return JSON.parse(normalized);
  } catch {
    const objectStart = normalized.indexOf("{");
    const arrayStart = normalized.indexOf("[");
    const starts = [objectStart, arrayStart].filter((value) => value >= 0);
    if (starts.length === 0) return null;

    const start = Math.min(...starts);
    const end = findJsonEnd(normalized, start);
    if (end < 0) return null;

    try {
      return JSON.parse(normalized.slice(start, end));
    } catch {
      return null;
    }
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, unknown> => item != null)
    : [];
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean);
  }

  const text = asString(value);
  return text
    ? text
        .split(/\n|[|,;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}
