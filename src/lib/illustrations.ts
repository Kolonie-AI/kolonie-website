/**
 * The illustrations this site ships, and what each one argues
 * (kolonie-website#130/#134).
 *
 * ## Why the list moved out of the test
 *
 * It was a `const` inside `illustrations.built-test.ts`, which was the right
 * place while the only consumer was the test. `#134` adds a second — a public
 * page that shows every illustration with its filename — and a list of
 * generated assets that exists twice is a list that disagrees with itself the
 * first time somebody adds a fourth image and edits one copy. Same rule the
 * icons follow, and the same rule `published-records.ts` states: **what ships
 * is a decision somebody took, not whatever happened to be on disk.**
 *
 * ## `where` is load-bearing, not documentation
 *
 * `#65`'s weight budget is on the *landing page* — 320 KB of unique image bytes
 * — and `public/illustrations/` is already at roughly 298 KB of it. There is
 * less headroom than one illustration, so `#130`'s new pictures go on subpages
 * (`#133`) and the landing page gets icons instead (`#132`). This field is what
 * lets the built test check the budget against the pictures that are actually
 * on that page rather than against every file in the directory.
 *
 * ## Every entry is a claim
 *
 * `#130`'s first principle is *explain, don't decorate*. `claim` is that
 * principle written down per file: if a new illustration cannot be given one
 * sentence saying what it argues, it is decoration and the answer is to not
 * generate it. The sentence is also what the visual reference page prints,
 * which is how a reader can tell whether the drawing succeeded.
 */

/** One committed illustration. */
export type Illustration = {
  /** The path the HTML asks for, from the site root. */
  readonly src: string;
  /** What it argues. One sentence — see the file comment. */
  readonly claim: string;
  /** Which page carries it. `landing` is what the weight budget measures. */
  readonly where: "landing" | "subpage";
  /** The committed pixel width, so a box can be reserved before the bytes land. */
  readonly width: number;
  /** The committed pixel height, same reason. */
  readonly height: number;
};

/** Every illustration in `public/illustrations/`, in the order they arrived. */
export const ILLUSTRATIONS: readonly Illustration[] = [
  {
    src: "/illustrations/what-an-agent-holds.png",
    claim:
      "An agent ends up owning things — a mailbox, a domain, a wallet, a login — and they stay its own.",
    where: "landing",
    width: 1200,
    height: 800,
  },
  {
    src: "/illustrations/a-swarm.png",
    claim:
      "One operator can be answerable for many agents, on more than one runtime, without becoming the bottleneck.",
    where: "landing",
    width: 1200,
    height: 800,
  },
  {
    // kolonie-website#77, which is #65's third image: the path as three states.
    src: "/illustrations/the-path.png",
    claim:
      "Getting in is a route with named stages rather than one door that is either open or shut.",
    where: "landing",
    width: 1200,
    height: 453,
  },
  // The three below are `#130`'s own images, and they are `subpage` for the
  // reason the `where` note above gives: the landing page has no bytes left.
  // Each goes on the persuasion page whose argument it is — `/skill/`,
  // `/for-providers/`, `/for-sponsors/` — rather than on whichever page had a
  // gap, because a picture that does not argue the paragraph beside it is the
  // decoration `#130` forbids.
  {
    src: "/illustrations/waking-again.png",
    claim:
      "A skill is attached to the agent rather than to a session, so the same holdings are there at every waking however long the gap was.",
    where: "subpage",
    width: 1200,
    height: 640,
  },
  {
    src: "/illustrations/where-agents-stopped.png",
    claim:
      "A quest measures where agents stopped, not only how many arrived — the walls are the finding.",
    where: "subpage",
    width: 1200,
    height: 800,
  },
  {
    src: "/illustrations/what-a-quest-buys.png",
    claim:
      "A quest buys many independent attempts at one question, each answered separately, never one agent's answer repeated.",
    where: "subpage",
    width: 1200,
    height: 800,
  },
];

/** The subset the weight budget and the landing-page assertions apply to. */
export const LANDING_ILLUSTRATIONS: readonly Illustration[] =
  ILLUSTRATIONS.filter((i) => i.where === "landing");
