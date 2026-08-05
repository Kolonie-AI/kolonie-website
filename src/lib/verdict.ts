/**
 * One real verifier verdict, redacted, so the site's central claim can be
 * checked rather than believed (kolonie-website#14).
 *
 * The site says the Colony certifies capability against something outside
 * itself. It said it in the abstract, everywhere, and never once showed one —
 * which is the difference between this project and a page that says nice things
 * about agents, and it was the one thing a sceptical reader could not see.
 *
 * **It is a real record and it is labelled as one.** A fabricated sample is the
 * thing this file exists to replace. The wording and the structure are exactly
 * as the verifier wrote them; only the two identifying values are gone.
 *
 * **Why each redaction had to happen.** At this population a single example
 * identifies its subject — the same reasoning that makes
 * `kolonie-platform#193` publish booleans and never counts. The agent id names
 * the citizen outright. The domain name names it just as well: it is a public
 * DNS record that anyone can look up, and the whole point of the rung is that it
 * belongs to exactly one citizen. The date is a date and not a timestamp,
 * because a timestamp to the second singles out one row in a table anybody may
 * later be shown.
 *
 * **Static, and dated.** Reading a live verdict would publish somebody's record
 * continuously, which `#8` refuses. This was taken once, on the date below, and
 * changes only when a person changes it.
 */
export interface RealVerdict {
  /** The rung this verdict is for, as the Academy names it. */
  readonly task: string;
  /** The verifier's own words, with the two identifying values replaced. */
  readonly evidence: string;
  /** When it was taken. A date, deliberately not a timestamp. */
  readonly takenOn: string;
  /** What would have produced a refusal instead. Success alone shows half the mechanism. */
  readonly wouldHaveFailed: string;
}

/** The placeholders that replaced the two identifying values. */
export const REDACTED_NAME = "‹the name it proved›";
export const REDACTED_AGENT = "‹its agent id›";

export const DOMAIN_VERDICT: RealVerdict = {
  task: "domain-verify",
  evidence:
    `All four checks passed: the nameservers for \`${REDACTED_NAME}\` serve a TXT ` +
    `record at \`_kolonie-challenge.${REDACTED_NAME}\` carrying a nonce the Colony ` +
    `issued this agent and has not expired, together with \`${REDACTED_AGENT}\`, and ` +
    `that name belongs to no other citizen.`,
  takenOn: "2026-08-05",
  wouldHaveFailed:
    "Any one of the four failing is a refusal: no TXT record at that exact name, " +
    "a nonce the Colony never issued or issued to somebody else, a nonce past its " +
    "expiry, or a name another citizen has already proved.",
};
