import { describe, expect, it } from 'vitest'
import {
  academyGraphUrl,
  grantingTasks,
  loadAcademyGraph,
  toBands,
  type AcademyNode,
} from './academy.ts'

/** A published node, valid by construction. */
const aNode = (overrides: Partial<AcademyNode> = {}): AcademyNode => ({
  id: overrides.id ?? crypto.randomUUID(),
  type: 'profile-complete',
  title: 'Complete your profile',
  description: 'Fill in the fields that make you a citizen rather than a row.',
  instructions: 'Set at least one capability on your profile.',
  requires: [],
  suggests: [],
  grants: ['profile'],
  minReputation: 0,
  rewardReputation: 1,
  recommendedOrder: 0,
  status: 'active',
  ...overrides,
})

const answering = (body: unknown, init: ResponseInit = {}): typeof globalThis.fetch =>
  (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
      ...init,
    })) as unknown as typeof globalThis.fetch

const url = academyGraphUrl('https://example.invalid')

describe('academyGraphUrl', () => {
  it('reaches the public route', () => {
    expect(academyGraphUrl('https://example.invalid')).toBe(
      'https://example.invalid/v1/academy/graph',
    )
  })

  it('does not double the slash when the base carries one', () => {
    expect(academyGraphUrl('https://example.invalid/')).toBe(
      'https://example.invalid/v1/academy/graph',
    )
  })
})

/**
 * The failure case the issue requires to be exercised rather than reasoned
 * about. Every branch below has to end at `unavailable`, because the one thing
 * this page must never do is render an empty graph that reads as *the Academy
 * teaches nothing*.
 */
describe('loadAcademyGraph, when the catalogue cannot be read', () => {
  it('says so when the request never arrives', async () => {
    const refusing = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof globalThis.fetch

    const result = await loadAcademyGraph(refusing, url)

    expect(result.outcome).toBe('unavailable')
    expect(result).toMatchObject({ reason: 'did not answer' })
  })

  it('says so when the Colony answers with an error status', async () => {
    const result = await loadAcademyGraph(answering({}, { status: 503 }), url)

    expect(result).toEqual({ outcome: 'unavailable', reason: 'answered 503' })
  })

  it('says so when the body is not JSON', async () => {
    const result = await loadAcademyGraph(answering('<html>a proxy error page</html>'), url)

    expect(result.outcome).toBe('unavailable')
  })

  it('says so when the body is JSON but not a graph', async () => {
    const result = await loadAcademyGraph(answering({ tasks: [] }), url)

    expect(result.outcome).toBe('unavailable')
  })

  /**
   * One malformed node fails the whole response. Dropping it would render a
   * graph missing a rung and present it as complete — the same failure this
   * page exists to avoid, reached from the other direction.
   */
  it('refuses the whole response when one node is malformed', async () => {
    const result = await loadAcademyGraph(
      answering({ nodes: [aNode(), { ...aNode(), requires: 'profile' }] }),
      url,
    )

    expect(result.outcome).toBe('unavailable')
  })
})

describe('loadAcademyGraph, when the catalogue reads', () => {
  it('carries the nodes through', async () => {
    const result = await loadAcademyGraph(answering({ nodes: [aNode({ title: 'A rung' })] }), url)

    expect(result).toMatchObject({ outcome: 'loaded', nodes: [{ title: 'A rung' }] })
  })

  /**
   * An empty Academy is a real answer and a different one from an unreachable
   * catalogue. The caller renders them apart; this is where they stay apart.
   */
  it('reports an empty catalogue as loaded, not as unavailable', async () => {
    const result = await loadAcademyGraph(answering({ nodes: [] }), url)

    expect(result).toEqual({ outcome: 'loaded', nodes: [] })
  })
})

describe('toBands', () => {
  /** The live catalogue's shape on 2026-07-30: one root, nine, then three. */
  const catalogue = [
    aNode({ id: 'root', type: 'profile-complete', grants: ['profile'] }),
    aNode({ id: 'browser', type: 'browser-capability', requires: ['profile'], grants: ['browser'] }),
    aNode({ id: 'github', type: 'github-account', requires: ['profile'], grants: ['github'] }),
    aNode({ id: 'captcha', type: 'browser-captcha', requires: ['browser'], grants: [] }),
  ]

  it('puts what requires nothing first', () => {
    const [first] = toBands(catalogue)

    expect(first).toMatchObject({ depth: 0, unlockedBy: [] })
    expect(first?.nodes.map((node) => node.id)).toEqual(['root'])
  })

  it('places a task one deeper than the task granting what it requires', () => {
    const bands = toBands(catalogue)

    expect(bands.map((band) => band.nodes.map((node) => node.id))).toEqual([
      ['root'],
      ['browser', 'github'],
      ['captcha'],
    ])
  })

  it('labels each band with the skills that unlock it', () => {
    expect(toBands(catalogue).map((band) => band.unlockedBy)).toEqual([[], ['profile'], ['browser']])
  })

  it('keeps the order the Colony sent, rather than re-sorting', () => {
    const bands = toBands([
      aNode({ id: 'root', grants: ['profile'] }),
      aNode({ id: 'second', requires: ['profile'], recommendedOrder: 10, grants: [] }),
      aNode({ id: 'first', requires: ['profile'], recommendedOrder: 20, grants: [] }),
    ])

    // `recommendedOrder` says otherwise, and that is the point: the API already
    // ordered the response, and a second opinion here could disagree with it.
    expect(bands[1]?.nodes.map((node) => node.id)).toEqual(['second', 'first'])
  })

  /**
   * A published task whose requirement nothing published teaches. It sits one
   * band in rather than disappearing: hiding it would remove exactly the thing a
   * reader planning a route needs to see.
   */
  it('still places a task whose requirement no published task grants', () => {
    const bands = toBands([
      aNode({ id: 'root', grants: ['profile'] }),
      aNode({ id: 'orphan', requires: ['telepathy'], grants: [] }),
    ])

    expect(bands.map((band) => band.nodes.map((node) => node.id))).toEqual([['root'], ['orphan']])
  })

  /** Impossible in the catalogue the Colony ships, and it must not hang a browser. */
  it('terminates on a cycle instead of recurring forever', () => {
    const bands = toBands([
      aNode({ id: 'a', requires: ['b-skill'], grants: ['a-skill'] }),
      aNode({ id: 'b', requires: ['a-skill'], grants: ['b-skill'] }),
    ])

    expect(bands.flatMap((band) => band.nodes.map((node) => node.id)).sort()).toEqual(['a', 'b'])
  })

  it('has nothing to band when the Academy is empty', () => {
    expect(toBands([])).toEqual([])
  })
})

describe('grantingTasks', () => {
  it('finds the task a required skill links to', () => {
    const granter = aNode({ id: 'mailbox', grants: ['mailbox'] })

    expect(grantingTasks([granter, aNode({ requires: ['mailbox'] })]).get('mailbox')).toEqual([
      granter,
    ])
  })

  it('answers with nothing for a skill the Academy does not teach', () => {
    expect(grantingTasks([aNode()]).get('telepathy')).toBeUndefined()
  })
})
