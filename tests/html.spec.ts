import { describe, expect, it } from "vitest";
import { replaceInHtmlText } from "@/app/lib/html";

describe("replaceInHtmlText", () => {
  it("replaces in text content and counts occurrences", () => {
    const { html, count } = replaceInHtmlText("<p>Nadia and Nadia</p>", "Nadia", "Mara");
    expect(html).toBe("<p>Mara and Mara</p>");
    expect(count).toBe(2);
  });

  it("never replaces inside tags or attributes", () => {
    const { html, count } = replaceInHtmlText(
      '<a href="/p">a paragraph p</a>',
      "p",
      "X"
    );
    // The tag and attribute keep their 'p'; only the text 'p's change.
    expect(html).toBe('<a href="/p">a XaragraXh X</a>');
    expect(count).toBe(3);
  });

  it("returns zero count when there is no match", () => {
    const { html, count } = replaceInHtmlText("<p>hello</p>", "world", "x");
    expect(html).toBe("<p>hello</p>");
    expect(count).toBe(0);
  });

  it("is a no-op for an empty search", () => {
    const { html, count } = replaceInHtmlText("<p>hi</p>", "", "x");
    expect(html).toBe("<p>hi</p>");
    expect(count).toBe(0);
  });
});
