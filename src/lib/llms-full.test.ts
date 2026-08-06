import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToText, removeHidden, renderLlmsFull } from "./llms-full.ts";

/**
 * `kolonie-website#47`. The route hands `htmlToText` what the Astro container
 * rendered; these hand it the shapes that were actually in the built output
 * and got the answer wrong, so a change that reintroduces one fails here
 * rather than in a file nobody reads.
 */

describe("removeHidden", () => {
  it("drops an element carrying `hidden`, contents included", () => {
    const html = `<p>kept</p><p hidden>the catalogue is unavailable</p><p>also kept</p>`;
    expect(removeHidden(html)).toBe("<p>kept</p><p>also kept</p>");
  });

  it("closes at the matching tag rather than the first one", () => {
    // The failure this exists for: a non-greedy `</div>` cuts the hidden block
    // at the inner close and leaks the outer tail into the document.
    const html = `<div hidden><div>inner</div>tail</div><p>kept</p>`;
    expect(removeHidden(html)).toBe("<p>kept</p>");
  });

  it("leaves an element whose attribute merely contains the word", () => {
    const html = `<p class="unhidden">kept</p>`;
    expect(removeHidden(html)).toContain("kept");
  });
});

describe("decodeEntities", () => {
  it("decodes named, decimal and hexadecimal references", () => {
    expect(decodeEntities("a &amp; b &#8212; c &#x2014; d &rsquo;e")).toBe("a & b — c — d ’e");
  });

  it("leaves an unknown reference alone rather than eating it", () => {
    expect(decodeEntities("&notareference;")).toBe("&notareference;");
  });
});

describe("htmlToText", () => {
  it("pushes the page's own headings below the heading the file gives it", () => {
    expect(htmlToText("<h2>The human half</h2>")).toBe("### The human half");
  });

  it("keeps a link's destination, including inside a list item", () => {
    // The order bug this is the regression test for: the list-item rule
    // reduces its contents by stripping tags, so running it before the link
    // rule silently drops every href in every bullet.
    const html = `<ul><li><a href="https://github.com/Kolonie-AI/kolonie-docs">kolonie-docs</a> — what the Colony is</li></ul>`;
    expect(htmlToText(html)).toContain(
      "- [kolonie-docs](https://github.com/Kolonie-AI/kolonie-docs) — what the Colony is",
    );
  });

  it("keeps a link's destination inside a heading and a table cell", () => {
    expect(htmlToText(`<h2><a href="/skill/">Join</a></h2>`)).toContain("[Join](/skill/)");
    expect(htmlToText(`<table><tr><td><a href="/skill/">Join</a></td><td>x</td></tr></table>`)).toContain(
      "| [Join](/skill/) | x |",
    );
  });

  it("renders a fenced block and keeps its newlines", () => {
    const html = `<pre><code>one\ntwo</code></pre>`;
    expect(htmlToText(html)).toBe("```\none\ntwo\n```");
  });

  it("drops a script, a style, an svg and a button label", () => {
    const html = `<p>kept</p><script>evil()</script><style>.a{}</style><svg><path/></svg><button>Copy</button>`;
    expect(htmlToText(html)).toBe("kept");
  });

  it("separates two adjacent inline elements that carry no whitespace", () => {
    // `profile1 reputation point` was the built output before this: a number
    // welded to the word before it, which a reader cannot take apart.
    expect(htmlToText(`<span>profile</span><span>1 reputation point</span>`)).toBe(
      "profile 1 reputation point",
    );
  });

  it("leaves no markup, no entity and no JSX expression behind", () => {
    const out = htmlToText(
      `<div><h2>Title</h2><p>The Colony is built by <strong>Kolonie AI FZ-LLC</strong> &mdash; really.</p></div>`,
    );
    expect(out).not.toMatch(/<[a-z/]/i);
    expect(out).not.toMatch(/&[a-z]+;/i);
    expect(out).not.toMatch(/\{[a-zA-Z_]/);
    expect(out).toContain("**Kolonie AI FZ-LLC** — really.");
  });
});

describe("renderLlmsFull", () => {
  const pages = [
    { path: "/academy/", title: "The Academy", text: "graph, not a ladder" },
    { path: "/skill/", title: "Join the Colony", text: "connect over MCP" },
  ];

  it("opens with the summary and inlines every page in the order given", () => {
    const out = renderLlmsFull("# Kolonie AI\n\n> summary", pages, "https://kolonie.ai");

    expect(out.startsWith("# Kolonie AI\n\n> summary")).toBe(true);
    expect(out.indexOf("## The Academy")).toBeLessThan(out.indexOf("## Join the Colony"));
    for (const page of pages) {
      expect(out).toContain(`## ${page.title}`);
      expect(out).toContain(`URL: https://kolonie.ai${page.path}`);
      expect(out).toContain(page.text);
    }
  });

  it("fails when a page is absent from the output", () => {
    // The rejection case `#47` asks for, at the level this function owns: a
    // page reaching the list and not the document.
    const out = renderLlmsFull("summary", [pages[0]], "https://kolonie.ai");
    expect(out).not.toContain("## Join the Colony");
  });
});
