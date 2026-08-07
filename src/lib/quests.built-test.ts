import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/quests/` describes the economy that exists (kolonie-website#71).
 *
 * D-106 deleted Quest Credits. The page described them for as long as it took
 * somebody to notice, and the failure mode is the one that matters most on this
 * site: a public page promising a mechanism that has been removed is wrong in a
 * way no build, no type check and no link check can see.
 *
 * **What is asserted is the retired machinery, not the vocabulary.** `#71` says
 * *"no mention of credits, deposit addresses, balances or refunds survives"*,
 * and read literally that fails the page for saying **no refunds** — which is
 * the single most important sentence on it. So what this checks is the nouns
 * that only the old design has a use for: an address the Colony issues you, and
 * the token that used to arrive at it. A page that reintroduces either has
 * reintroduced custody, which is the property the new design exists to remove.
 */

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

const text = (file: string): string =>
  readFileSync(join(dist, file), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

/** The machinery D-106 retired. Each is a thing, not a word about a thing. */
const RETIRED = [
  "deposit address",
  "usdc",
  "quest credits",
  "funding page",
  "unspent funding",
];

describe("/quests/ documents the flow that exists", () => {
  const page = text("quests/index.html");

  it.each(RETIRED)("does not reintroduce %s", (term) => {
    expect(page).not.toContain(term);
  });

  /**
   * The positive half. Naming the retired machinery is not enough on its own —
   * a page could pass the list above by saying nothing at all about payment.
   */
  it("says how a sponsor actually pays", () => {
    expect(page).toContain("sol");
    expect(page).toContain("your own verified address");
    expect(page).toContain("wallet");
  });

  /**
   * `#71`: *"the one thing that must be unmissable."* A sponsor has to meet
   * irreversibility here rather than discover it afterwards, and this asserts
   * all three halves of it — the money not returning, unfilled capacity not
   * returning, and the sentence that names the trade.
   */
  it("makes irreversibility unmissable", () => {
    expect(page).toContain("publishing is the purchase");
    expect(page).toContain("does not come back");
    expect(page).toContain("capacity nobody fills is not returned");
  });
});
