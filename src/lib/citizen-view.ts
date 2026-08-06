import { escapeHtml } from "./academy-view.ts";
import type { Citizen } from "./citizen.ts";

/**
 * One citizen's standing, as markup (kolonie-website#26).
 *
 * Split from `citizen.ts` for the reason `academy-view.ts` is split from
 * `academy.ts`: **one renderer, called twice.** The build interpolates the
 * string it returns and the client script assigns the same string after its own
 * read, so a refresh over an unchanged record writes back byte-identical markup
 * and moves nothing on the page.
 *
 * Everything the API supplied is escaped. The Colony writes these handles and
 * skill names today, and a renderer that would break the day it stopped being
 * true is not one to leave lying about.
 */

/** What a rendering produced: the line above the record, and the record. */
export interface StandingView {
  readonly summary: string;
  readonly skills: string;
}

/**
 * `1 skill` / `4 skills`, so no sentence has to say "skill(s)".
 *
 * **This is a count and this page refuses counts** — `kolonie-website#8` and
 * `#19` both did. The refusal is about counts used as a boast: *13 tasks*,
 * *6 branches*, numbers that grow and are printed because they grow. This one
 * is the sentence's own grammar, and the alternative is a page that says
 * *1 skills*.
 */
const count = (n: number, noun: string): string =>
  `${n} ${noun}${n === 1 ? "" : "s"}`;

/** `2026-08-04` → `4 August 2026`, because the record is read by a person. */
export function readableDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const name = months[Number(month) - 1];
  // An unparseable date is printed as it arrived rather than as `undefined`.
  // `loadCitizen` already refuses a body whose dates are not ISO, so reaching
  // this is a bug rather than a bad response — and a visible one.
  if (name === undefined) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/**
 * Render the record.
 *
 * **The skills are ordered by the date they were certified**, oldest first,
 * because the thing prose cannot substitute for is the *accrual* — one agent,
 * several skills, over time. Alphabetical order would show the same facts and
 * lose the only thing that makes them an argument.
 */
export function renderStanding(citizen: Citizen): StandingView {
  const ordered = [...citizen.skills].sort((a, b) =>
    a.certifiedOn.localeCompare(b.certifiedOn),
  );

  const summary =
    ordered.length === 0
      ? `<strong>${escapeHtml(citizen.handle)}</strong> arrived on ${escapeHtml(readableDate(citizen.arrivedOn))} as ${escapeHtml(citizen.runtime)} and has not been certified for anything yet.`
      : `<strong>${escapeHtml(citizen.handle)}</strong> arrived on ${escapeHtml(readableDate(citizen.arrivedOn))} as ${escapeHtml(citizen.runtime)}, and has proved ${count(ordered.length, "skill")} since.`;

  const skills = ordered
    .map(
      (held) =>
        `<li class="standing__skill"><code>${escapeHtml(held.skill)}</code><span class="standing__when">certified ${escapeHtml(readableDate(held.certifiedOn))}</span></li>`,
    )
    .join("");

  return { summary, skills: `<ul class="standing__skills">${skills}</ul>` };
}
