/**
 * Where the provider form sends what a provider writes (kolonie-website#76).
 *
 * The route is `kolonie-platform#544`'s. It is unauthenticated by design —
 * *"a provider that has to register in order to ask has already left"* — and its
 * whole spam defence is the captcha, which is why the sitekey is fetched rather
 * than the form being posted bare.
 *
 * **The sitekey is read at runtime and not baked in.** It lives in the VPS
 * environment as `HCAPTCHA_SITEKEY` and is served publicly at
 * `/v1/academy/captcha-config`, already with `access-control-allow-origin: *`.
 * A copy in this repository would be a second version of a value nobody here
 * owns, and it would go stale silently on the day it is rotated — which is the
 * failure `entity.ts` and `skill-pitch.ts` were both written to avoid, applied
 * to a value rather than to a paragraph.
 *
 * **The confirmation is not here either.** `PROVIDER_ENQUIRY_CONFIRMATION` lives
 * once, in `kolonie-platform`, and the form shows whatever the route answers
 * with. That is deliberate: the sentence is *interest is not a listing*, said at
 * the moment a provider is most likely to believe otherwise, and a second copy
 * on this side is a copy that can be softened.
 */
export const PROVIDER_ENQUIRY = {
  /** The Colony's REST surface. */
  api: "https://api.kolonie.ai",
  /** `kolonie-platform#544`. */
  path: "/v1/atlas/enquiries",
  /** Public, no credential, and the only place the sitekey is read from. */
  configPath: "/v1/academy/captcha-config",
  /**
   * The one third-party script this site loads, on one page, after the reader's
   * first keystroke in the form.
   *
   * `governance/privacy.md` names it. Before `#76` the site loaded none at all,
   * and that sentence had been defended three times in a week — so this constant
   * exists partly so that `no-analytics.built-test.ts`'s successor can point at
   * the one exception rather than at a URL buried in a component.
   */
  script: "https://js.hcaptcha.com/1/api.js?onload=hcaptchaOnLoad&render=explicit",
} as const;

/** Where the page lives, so the footer and the tests agree on it. */
export const PROVIDER_PATH = "/for-providers/";
