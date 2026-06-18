/**
 * Replace occurrences of `search` with `replace` only inside the text content
 * of an HTML string, never inside tags or attributes. Pure and DOM-free so it
 * runs anywhere and is unit-testable. Returns the new HTML and the number of
 * text-node occurrences replaced.
 */
export function replaceInHtmlText(
  html: string,
  search: string,
  replace: string
): { html: string; count: number } {
  if (!search) return { html, count: 0 };

  let count = 0;
  const result = html
    .split(/(<[^>]+>)/)
    .map((segment) => {
      if (segment.startsWith("<") && segment.endsWith(">")) return segment;
      if (!segment.includes(search)) return segment;
      const parts = segment.split(search);
      count += parts.length - 1;
      return parts.join(replace);
    })
    .join("");

  return { html: result, count };
}
