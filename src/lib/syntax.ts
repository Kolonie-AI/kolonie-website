/**
 * Which TextMate scope gets which colour (kolonie-website#31).
 *
 * The copy-boxes are the objects a reader forms their whole impression of this
 * project on — every entry point the Colony has is one of them — and they
 * rendered as flat grey text while the highlighter that could have coloured
 * them was already installed and running on Markdown fences.
 *
 * **The colours are `var()` references, not values.** Shiki writes whatever
 * string it is given straight into the token's `style` attribute, so handing it
 * `var(--k-syn-command)` produces markup that follows `theme.css` — which is
 * what keeps the single-token-file rule true, and what makes the light theme
 * work at all. A theme of resolved hex colours would freeze the dark palette
 * onto `/skill`, which is a page that has both.
 *
 * **What is coloured is what means something.** An unquoted argument stays
 * plain: on these snippets that is the URL, the package name and the
 * subcommand, and a line where every word is a different colour is a line
 * nobody reads. Four things get a colour — the command, its options, quoted
 * strings, and comments — because those are the four a reader is actually
 * scanning for.
 */

/** A colour, named. Every one of these is declared in `src/styles/theme.css`. */
const token = (name: string) => `var(--k-syn-${name})`

/**
 * A Shiki theme registration, in the shape `astro:components`' `<Code>` takes.
 *
 * `type: 'dark'` is Shiki bookkeeping and not a claim about the page: the
 * colours are variables, so the same registration renders correctly under both
 * themes. It only decides which of Shiki's own defaults would apply if one of
 * these scopes were missed.
 */
export const SYNTAX_THEME = {
  name: 'kolonie',
  type: 'dark' as const,
  // Transparent, because the box around the snippet is drawn by the component
  // and a second background inside it would be a second edge.
  bg: 'transparent',
  fg: token('plain'),
  settings: [
    { settings: { foreground: token('plain') } },
    {
      // `curl`, `npx`, `claude` — the first word, and the one a reader looks
      // for to know what they are about to run.
      scope: ['entity.name.command', 'entity.name.function', 'support.function'],
      settings: { foreground: token('command') },
    },
    {
      // `-X`, `-H`, `--global`. The shell grammar calls these
      // `constant.other.option`, and they are the part of a command line that
      // is most often mistyped.
      scope: ['constant.other.option', 'entity.name.tag', 'variable.parameter'],
      settings: { foreground: token('flag') },
    },
    {
      scope: ['string', 'string.quoted', 'meta.string'],
      settings: { foreground: token('string') },
    },
    {
      /**
       * And back to plain for the arguments that are not quoted.
       *
       * The shell grammar files every bare word after the command under
       * `string.unquoted.argument.shell` — which on our snippets is the URL,
       * the package name and the subcommand. Left under the rule above they
       * come out the same colour as a quoted string, and the `curl` reads as
       * six coloured words in a row. This scope is longer than `string`, so it
       * wins, and it is the rule that keeps the palette meaning something.
       */
      scope: ['string.unquoted.argument'],
      settings: { foreground: token('plain') },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.type.property-name'],
      settings: { foreground: token('value') },
    },
    {
      scope: ['punctuation', 'keyword.operator', 'constant.character.escape'],
      settings: { foreground: token('punct') },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: token('comment'), fontStyle: 'italic' },
    },
  ],
}

/**
 * The languages a snippet on this site may declare.
 *
 * `null` is the important one and it is not an absence: the join prompt is the
 * sentence *"Read https://kolonie.ai/skill and become a citizen of the
 * Colony"*, and syntax-colouring a sentence is the highlighter asserting
 * something untrue about it. Those keep the plain treatment, and the terminal
 * chrome is what tells a reader the difference (kolonie-website#31).
 */
export type SnippetLanguage = 'bash' | 'json' | null
