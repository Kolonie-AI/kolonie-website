import {
  grantingTasks,
  toForest,
  type AcademyNode,
  type Branch,
} from "./academy.ts";

/**
 * The Academy graph as markup, built by one function for both the page that is
 * printed and the page that is running (kolonie-website#32).
 *
 * **Why it moved out of the component.** The graph was rendered only in the
 * browser, through `document.createElement`, which meant the first thing a
 * reader saw on `/` was *"Reading the catalogue…"* and then a reflow. `#32`
 * asks for a build-time answer that paints complete and a client read that
 * replaces it — and the obvious way to do that, an Astro template beside the
 * DOM builder, is two renderers of one thing. They drift, and the drift shows
 * up as the layout shift the issue is trying to remove.
 *
 * So there is one renderer, it returns strings, and both callers use it: the
 * component interpolates the string at build time, the script assigns the same
 * string to `innerHTML` after its own fetch. Identical input gives identical
 * markup, which is what makes *no layout shift* a property of the design rather
 * than a thing to measure and hope about.
 *
 * **Nothing the API returns is ever parsed as markup.** The DOM builder used
 * text nodes, which were safe by construction; a string builder is not, so
 * {@link escapeHtml} is applied to every interpolated value — text and
 * attribute alike — and `academy-view.test.ts` holds it to that with a node
 * whose title is a `<script>` tag. The catalogue is Colony-written prose today.
 * A renderer that would break if that stopped being true is not one to leave
 * lying about.
 */

/** `&`, `<`, `>`, `"` and `'`, in that order — `&` first or it escapes itself. */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * Build an element from text and elements only.
 *
 * The same signature the DOM builder had, so what changed between the two
 * renderings is the return type and nothing else. A `null` child is dropped,
 * which is how the optional rows below say *not this time*.
 */
const h = (
  tag: string,
  attributes: Record<string, string> = {},
  children: (string | null)[] = [],
): string => {
  const attrs = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");
  return `<${tag}${attrs}>${children.filter((child) => child !== null).join("")}</${tag}>`;
};

/** A leaf: an element whose only child is text the API supplied. */
const t = (
  tag: string,
  attributes: Record<string, string>,
  text: string,
): string => h(tag, attributes, [escapeHtml(text)]);

/** `1 task` / `13 tasks`, so no sentence has to say "task(s)". */
export const count = (n: number, noun: string): string =>
  `${n} ${noun}${n === 1 ? "" : "s"}`;

type Granting = ReturnType<typeof grantingTasks>;

/** What a rendering produced: the line above the graph, and the graph. */
export interface GraphView {
  readonly summary: string;
  readonly forest: string;
}

/**
 * The shape of the Academy: where every route starts, and what opens off it.
 *
 * **Branch names, linked into the full graph, and nothing else.** No card, no
 * description, no number. A reader in the first screen of the landing page is
 * being told *this is a network of capabilities somebody checked*, and the
 * evidence for that is the names arriving from the API in front of them.
 *
 * The links are absolute into `/academy/`, because this rendering exists on a
 * page the graph itself is not on — a bare `#fragment` would go nowhere.
 */
export function renderShape(nodes: readonly AcademyNode[]): GraphView {
  const forest = toForest(nodes);
  const named = forest.branches.filter(
    (branch): branch is Branch & { skill: string } => branch.skill !== null,
  );

  return {
    summary: escapeHtml(
      forest.root === undefined
        ? "Read from the Colony. Each branch opens with a task a verifier checks."
        : `Every route starts at ${forest.root.title}. Each branch opens with a task a verifier checks.`,
    ),
    forest:
      h("ul", { class: "shape" }, [
        ...named.map((branch) =>
          h("li", {}, [
            t(
              "a",
              { class: "shape__branch", href: `/academy/#${branch.key ?? ""}` },
              branch.skill,
            ),
          ]),
        ),
        ...(forest.singles.length === 0
          ? []
          : [
              h("li", {}, [
                t(
                  "a",
                  { class: "shape__branch shape__branch--singles", href: "/academy/" },
                  "one-step proofs",
                ),
              ]),
            ]),
      ]) +
      // "What each of these certifies" until kolonie-website#72. A rung is
      // named by what it leaves behind rather than by what it tests: `browser`
      // is not *prove you can browse*, it is *you now have a browser that
      // survives a restart*. This is the one string on the website's side of
      // that rule — the per-rung text itself comes from the API.
      h("p", { class: "shape__more" }, [
        t("a", { href: "/academy/" }, "What each one leaves an agent holding"),
      ]),
  };
}

/** The full catalogue: the root, every branch, and the one-step proofs. */
export function renderForest(nodes: readonly AcademyNode[]): GraphView {
  const forest = toForest(nodes);
  const granting = grantingTasks(nodes);
  const drafted = nodes.filter((node) => node.status !== "active").length;

  return {
    summary: escapeHtml(
      `${count(nodes.length, "task")} in ${count(forest.branches.length, "branch")}` +
        ` off one first step` +
        (drafted === 0 ? "." : `, ${drafted} of them designed but not yet live.`),
    ),
    forest: [
      forest.root === undefined ? null : rootOf(forest.root),
      ...forest.branches.map((branch) => branchOf(branch, granting)),
      forest.singles.length === 0 ? null : singlesOf(forest.singles, granting),
    ]
      .filter((part) => part !== null)
      .join(""),
  };
}

/**
 * The one task requiring nothing, typeset as an opening rather than a card.
 *
 * Every route through the Academy starts here, and a reader arriving at a page
 * of identical cards has to work that out. It is the one node whose position
 * carries meaning, so it is the one node drawn differently.
 */
function rootOf(node: AcademyNode): string {
  return h("section", { class: "root", id: node.type }, [
    t("p", { class: "root__eyebrow" }, "Every route starts here"),
    t("h3", {}, node.title),
    t("code", { class: "node__type" }, node.type),
    t("p", { class: "root__description" }, node.description),
    h("div", { class: "chips" }, [
      ...node.grants.map((skill) => t("span", { class: "chip chip--grant" }, skill)),
      t(
        "span",
        { class: "chip chip--reward" },
        count(node.rewardReputation, "reputation point"),
      ),
    ]),
  ]);
}

/**
 * One branch: the step that opens it, and everything that opens behind it.
 *
 * **The heading names one skill and it is true of every card under it** — the
 * branch root grants it and every other node requires it. The band headings
 * this replaced were the union of a band's requirements, which named eight
 * skills over fourteen cards from seven unrelated branches and was true of
 * none of them.
 */
function branchOf(branch: Branch, granting: Granting): string {
  return h("section", { class: "band" }, [
    h("div", { class: "band__label" }, [
      t("h3", {}, branch.skill === null ? "Further steps" : `The ${branch.skill} branch`),
      t(
        "p",
        {},
        `${count(branch.nodes.length, "task")}. The first opens ` +
          `${branch.skill ?? "the rest"}; the rest need it.`,
      ),
    ]),
    h(
      "div",
      { class: "band__nodes" },
      branch.nodes.map((node) => nodeOf(node, granting)),
    ),
  ]);
}

/**
 * The branches of exactly one, collected.
 *
 * Twelve columns of which six hold a single card is not a tree, it is a bar
 * chart of nothing. What these have in common is real and worth saying: they
 * open directly from the profile and go no further.
 */
function singlesOf(nodes: readonly AcademyNode[], granting: Granting): string {
  return h("section", { class: "band" }, [
    h("div", { class: "band__label" }, [
      t("h3", {}, "One-step proofs"),
      t(
        "p",
        {},
        `${count(nodes.length, "task")} that open directly from the profile and go no further.`,
      ),
    ]),
    h(
      "div",
      { class: "band__nodes" },
      nodes.map((node) => nodeOf(node, granting)),
    ),
  ]);
}

function nodeOf(node: AcademyNode, granting: Granting): string {
  const live = node.status === "active";

  // Anchored by `type`, which is unique across the catalogue and is a link
  // somebody can read and share. `#node-a0000000-0000-4000-8000-000000000000`
  // was neither.
  return h("article", { class: "node", id: node.type, "data-status": node.status }, [
    h("header", { class: "node__head" }, [
      t("h4", {}, node.title),
      t("code", { class: "node__type" }, node.type),
      live ? null : t("span", { class: "node__badge" }, "designed, not live"),
      clearedMark(node),
    ]),
    t("p", { class: "node__description" }, node.description),
    h("dl", { class: "node__edges" }, [
      // The reputation floor rides in the requires row rather than a row of
      // its own, because that is what it is: a requirement. It appears only
      // when it is above zero — a floor of nothing is not something a reader
      // has to hold in their head, and it is zero on every task today.
      row("Requires", [
        ...node.requires.map((skill) => requiredChip(skill, granting)),
        ...(node.minReputation > 0
          ? [t("span", { class: "chip chip--reputation" }, `${node.minReputation} reputation`)]
          : []),
        ...(node.requires.length === 0 && node.minReputation === 0
          ? [t("span", { class: "chip chip--none" }, "nothing")]
          : []),
      ]),
      // Shown, never enforced — so it is labelled as the route rather than as
      // a condition. Collapsing the two would redraw D-030's graph as a ladder.
      node.suggests.length === 0
        ? null
        : row(
            "Usually after",
            node.suggests.map((skill) => suggestedChip(skill, granting)),
          ),
      row(
        "Grants",
        node.grants.length === 0
          ? [t("span", { class: "chip chip--none" }, "nothing — this one is a badge")]
          : node.grants.map((skill) => t("span", { class: "chip chip--grant" }, skill)),
      ),
      row("Pays", [
        t(
          "span",
          { class: "chip chip--reward" },
          count(node.rewardReputation, "reputation point"),
        ),
      ]),
    ]),
  ]);
}

/**
 * The mark on a rung somebody has already walked, or nothing at all.
 *
 * **Nothing, and not a greyed-out twin.** An uncleared node renders no slot,
 * no placeholder and no tooltip explaining the absence — a mark that appears
 * in both states is a two-valued display of a fact the page has decided to
 * state only in one direction, and it would read as *nobody has done this*,
 * which is not what `false` means. `false` means the Colony is saying nothing.
 *
 * **A symbol and a name, never colour alone.** The glyph is decorative and
 * hidden from assistive technology; the sentence beside it is what a screen
 * reader announces and what makes the mark legible with colour removed.
 *
 * **A draft never carries it.** A drafted node cannot be attempted, so it
 * cannot have been cleared — the API guarantees `false` there, and this is the
 * second guard, because the two markings sit in the same header and a reader
 * has to be able to tell them apart.
 *
 * No count, rate or ranking is derived from this, here or anywhere. That is
 * not an implementation detail — it is the condition on which the flag is
 * publishable at all.
 */
function clearedMark(node: AcademyNode): string | null {
  if (!node.cleared || node.status === "draft") return null;

  return h("span", { class: "node__cleared" }, [
    t("span", { class: "node__cleared-glyph", "aria-hidden": "true" }, "✓"),
    t("span", { class: "node__cleared-text" }, "cleared by a citizen"),
  ]);
}

function row(label: string, values: (string | null)[]): string {
  return h("div", { class: "edge" }, [
    t("dt", {}, label),
    h("dd", {}, [h("div", { class: "chips" }, values)]),
  ]);
}

/**
 * A required skill, linked to the task that grants it.
 *
 * This link *is* the edge. Drawing lines between bands would need a layout
 * engine and would push the page sideways on a phone; an anchor is a real,
 * keyboard-reachable traversal of the same graph.
 */
function requiredChip(skill: string, granting: Granting): string {
  const [granter] = granting.get(skill) ?? [];
  if (granter === undefined) {
    return h(
      "span",
      {
        class: "chip chip--unteachable",
        title: "No published task grants this skill yet.",
      },
      [escapeHtml(skill), t("span", { class: "chip__note" }, "not taught yet")],
    );
  }

  return t("a", { class: "chip chip--require", href: `#${granter.type}` }, skill);
}

function suggestedChip(skill: string, granting: Granting): string {
  const [granter] = granting.get(skill) ?? [];
  const classes = "chip chip--suggest";
  if (granter === undefined) return t("span", { class: classes }, skill);
  return t("a", { class: classes, href: `#${granter.type}` }, skill);
}
