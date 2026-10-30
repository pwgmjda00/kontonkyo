import rawEvents from '../data/probability_events_1026.json';

/** Uint32 words. Inject a deterministic source in tests; production always uses crypto. */
export type WordSource = () => number;
export type AnimationId = 'freeze' | 'numbers' | 'cosmos';
export interface ProbabilityEvent {
  readonly id: string;
  readonly family: string;
  readonly title: string;
  readonly condition: string;
  readonly numerator: string;
  readonly denominator: string;
  readonly probability: string;
  readonly fact: string;
  readonly animationId: AnimationId;
  readonly sourceStatus: 'mathematical';
  readonly verified: true;
  readonly bonusEligible: boolean;
}

interface Bound {
  readonly value: bigint;
  readonly words: number;
  readonly topMask: bigint;
}
interface CompiledEvent { readonly numerator: bigint; readonly denominator: bigint; readonly bound: Bound }
const bounds = new Map<bigint, Bound>();
const compiled = new WeakMap<ProbabilityEvent, CompiledEvent>();
const WORD_BITS = 32n;

/** Fill under Web Crypto's 65,536-byte quota; independent words remain independent. */
export function createCryptoWordSource(poolSize = 4096): WordSource {
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 16384) throw new RangeError('Invalid crypto pool size');
  const buffer = new Uint32Array(poolSize);
  let cursor = buffer.length;
  return () => {
    if (cursor === buffer.length) {
      if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness is unavailable');
      globalThis.crypto.getRandomValues(buffer);
      cursor = 0;
    }
    return buffer[cursor++]!;
  };
}
const secureWord = createCryptoWordSource();

function compileBound(value: bigint): Bound {
  if (value < 1n) throw new RangeError('Random upper bound must be positive');
  const found = bounds.get(value);
  if (found) return found;
  // For powers of two, bound-1 avoids discarding half the generated values.
  const bits = (value - 1n).toString(2).length;
  const words = Math.ceil(bits / 32);
  const upperBits = bits - (words - 1) * 32;
  const result = Object.freeze({ value, words, topMask: (1n << BigInt(upperBits)) - 1n });
  bounds.set(value, result);
  return result;
}

function word(rng: WordSource): bigint {
  const value = rng();
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError('RNG must return an unsigned 32-bit word');
  return BigInt(value);
}

function sampleCompiled(bound: Bound, rng: WordSource): bigint {
  if (bound.value === 1n) return 0n;
  for (;;) {
    let candidate = word(rng) & bound.topMask;
    for (let i = 1; i < bound.words; i++) candidate = (candidate << WORD_BITS) | word(rng);
    // Modulo would give low residues extra weight. Reject the incomplete interval.
    if (candidate < bound.value) return candidate;
  }
}

/** Uniform integer in [0, bound), including bounds larger than Number.MAX_SAFE_INTEGER. */
export function sampleBelow(bound: bigint, rng: WordSource = secureWord): bigint {
  return sampleCompiled(compileBound(bound), rng);
}

/** Exact Bernoulli draw. Neither numerator nor denominator is rounded to Number. */
export function drawRational(numerator: bigint, denominator: bigint, rng: WordSource = secureWord): boolean {
  if (denominator < 1n || numerator < 0n || numerator > denominator) throw new RangeError('Invalid rational probability');
  if (numerator === 0n) return false;
  if (numerator === denominator) return true;
  return sampleBelow(denominator, rng) < numerator;
}

export function isBonusEligible(event: Pick<ProbabilityEvent, 'numerator' | 'denominator'>): boolean {
  return BigInt(event.numerator) * 257n <= BigInt(event.denominator);
}

function compileEvent(event: ProbabilityEvent): CompiledEvent {
  const found = compiled.get(event);
  if (found) return found;
  const denominator = BigInt(event.denominator);
  const result = Object.freeze({ numerator: BigInt(event.numerator), denominator, bound: compileBound(denominator) });
  compiled.set(event, result);
  return result;
}

/** Explicit adapter: the ZIP schema remains unchanged and all rational strings survive. */
export function loadEvents(input: unknown = rawEvents): readonly ProbabilityEvent[] {
  if (!Array.isArray(input) || !input.length) throw new TypeError('Probability events must be a nonempty array');
  const ids = new Set<string>();
  const events = input.map((item: unknown, index: number) => {
    if (!item || typeof item !== 'object') throw new TypeError(`Event ${index} is not an object`);
    const record = item as Record<string, unknown>;
    for (const name of ['id', 'family', 'title', 'condition', 'numerator', 'denominator', 'probability', 'fact'] as const) {
      if (typeof record[name] !== 'string' || !record[name].trim()) throw new TypeError(`Event ${index}: invalid ${name}`);
    }
    const id = record.id as string;
    if (ids.has(id)) throw new TypeError(`Duplicate event ID: ${id}`);
    ids.add(id);
    if (!/^\d+$/.test(record.numerator as string) || !/^\d+$/.test(record.denominator as string)) throw new TypeError(`Invalid integer strings: ${id}`);
    const numerator = BigInt(record.numerator as string);
    const denominator = BigInt(record.denominator as string);
    if (numerator < 1n || denominator < 1n || numerator > denominator) throw new RangeError(`Invalid probability range: ${id}`);
    const fraction = /^(\d+)\/(\d+)$/.exec(record.probability as string);
    if (!fraction || BigInt(fraction[2]!) < 1n || numerator * BigInt(fraction[2]!) !== denominator * BigInt(fraction[1]!)) throw new TypeError(`Inconsistent probability: ${id}`);
    const eligible = numerator * 257n <= denominator;
    if (record.bonusEligible !== eligible) throw new TypeError(`Incorrect BONUS threshold: ${id}`);
    if (record.verified !== true || record.sourceStatus !== 'mathematical') throw new TypeError(`Unverified mathematical event: ${id}`);
    if (!['freeze', 'numbers', 'cosmos'].includes(record.animationId as string)) throw new TypeError(`Unknown animation: ${id}`);
    const event: ProbabilityEvent = Object.freeze({
      id, family: record.family as string, title: record.title as string, condition: record.condition as string,
      numerator: record.numerator as string, denominator: record.denominator as string,
      probability: record.probability as string, fact: record.fact as string,
      animationId: record.animationId as AnimationId, sourceStatus: 'mathematical', verified: true, bonusEligible: eligible,
    });
    compileEvent(event);
    return event;
  });
  return Object.freeze(events);
}

export const EVENTS = loadEvents();
export const EVENT_BY_ID: ReadonlyMap<string, ProbabilityEvent> = new Map(EVENTS.map(event => [event.id, event]));

/** Ascending exact probability, with a stable ID tie-breaker. */
export function compareRarity(a: ProbabilityEvent, b: ProbabilityEvent): number {
  const first = compileEvent(a);
  const second = compileEvent(b);
  const left = first.numerator * second.denominator;
  const right = second.numerator * first.denominator;
  return left < right ? -1 : left > right ? 1 : a.id.localeCompare(b.id);
}

export function mostRare(events: readonly ProbabilityEvent[]): ProbabilityEvent | null {
  let rarest: ProbabilityEvent | null = null;
  for (const event of events) if (!rarest || compareRarity(event, rarest) < 0) rarest = event;
  return rarest;
}

export interface RoundRoll {
  readonly hits: ProbabilityEvent[];
  readonly trigger: boolean;
  readonly candidate: ProbabilityEvent | null;
  readonly theater: boolean;
  readonly durationMs: number;
}

/** Each mathematical event gets its own draw, including events with identical values. */
export function rollRound(events: readonly ProbabilityEvent[] = EVENTS, rng: WordSource = secureWord): RoundRoll {
  const started = performance.now();
  const hits: ProbabilityEvent[] = [];
  for (const event of events) {
    const probability = compileEvent(event);
    if (probability.numerator === probability.denominator || sampleCompiled(probability.bound, rng) < probability.numerator) hits.push(event);
  }
  // A fresh independent draw governs only presentation, never real discovery.
  const trigger = drawRational(1n, 99n, rng);
  const candidate = trigger ? mostRare(hits.filter(isBonusEligible)) : null;
  return { hits, trigger, candidate, theater: trigger && !candidate, durationMs: performance.now() - started };
}

export type GamingTier = 'super' | 'hot' | 'normal';
/** One exclusive category: 5/100, 20/100, 75/100. This is not a mathematical event win. */
export function rollGaming(rng: WordSource = secureWord): GamingTier {
  const value = sampleBelow(100n, rng);
  return value < 5n ? 'super' : value < 25n ? 'hot' : 'normal';
}

export interface ProbabilityWorkerRequest { readonly id: number; readonly type: 'roll' | 'gaming' }
export interface ProbabilityWorkerResponse {
  readonly id: number;
  readonly hits: string[];
  readonly trigger: boolean;
  readonly candidateId: string | null;
  readonly theater: boolean;
  readonly tier: GamingTier | null;
  readonly durationMs: number;
  readonly error?: string;
}
