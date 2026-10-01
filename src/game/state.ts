import { CARDS, CARD_BY_ID, getCard } from '../data'
import { hasTagAnyFace } from '../engine/helpers'
import { shuffle, type Rng } from './rng'

/** Luật gốc: khu bỏ bài đủ 10 lá thì hết ván. */
export const DISCARD_LIMIT = 10
export const MIN_DISCARD_LIMIT = 5
export const MAX_DISCARD_LIMIT = 20
export const MIN_BOTS = 1
export const MAX_BOTS = 5
export const STARTING_REMIX = 6

export type Difficulty = 'easy' | 'hard'
export type Source = 'remix' | 'villain' | 'discard'
export type Phase = 'draw' | 'cerebro' | 'discard' | 'over'

export interface Seat {
  id: string
  name: string
  /** Không có = người chơi thật. */
  bot?: Difficulty
  hand: string[]
  /** Lá Loki rút cuối ván (nếu có Loki). */
  lokiCard?: string
}

export interface PlayGame {
  /** Đỉnh chồng bài = phần tử cuối. */
  remix: string[]
  villain: string[]
  /** Lá bỏ sau cùng ở cuối. */
  discard: string[]
  seats: Seat[]
  turn: number
  phase: Phase
  /** Khu bỏ bài đủ ngần này lá thì hết ván. */
  discardLimit: number
  /** Lá vừa lấy từ khu bỏ bài — không được bỏ lại ngay. */
  taken?: string
  log: string[]
}

export interface NewGameOptions {
  name: string
  bots: number
  difficulty: Difficulty
  discardLimit?: number
}

const ids = (deck: 'REMIX' | 'VILLAIN') => CARDS.filter(c => c.deck === deck).map(c => c.id)
const nameOf = (id: string) => getCard(id).name

export function newPlayGame(opts: NewGameOptions, rng: Rng = Math.random): PlayGame {
  const bots = Math.max(MIN_BOTS, Math.min(MAX_BOTS, opts.bots))
  const remix = shuffle(ids('REMIX'), rng)
  const villain = shuffle(ids('VILLAIN'), rng)
  const seats: Seat[] = [
    { id: 'you', name: opts.name.trim() || 'Bạn', hand: [] },
    ...Array.from({ length: bots }, (_, i): Seat => ({ id: `bot${i + 1}`, name: `Bot ${i + 1}`, bot: opts.difficulty, hand: [] })),
  ]
  for (const s of seats) s.hand = [...remix.splice(-STARTING_REMIX), ...villain.splice(-1)]
  const turn = Math.floor(rng() * seats.length)
  const discardLimit = clampLimit(opts.discardLimit)
  return { remix, villain, discard: [], seats, turn, phase: 'draw', discardLimit, log: [`${seats[turn].name} đi trước.`] }
}

function clampLimit(n: unknown): number {
  return Number.isInteger(n) ? Math.max(MIN_DISCARD_LIMIT, Math.min(MAX_DISCARD_LIMIT, n as number)) : DISCARD_LIMIT
}

export const current = (g: PlayGame) => g.seats[g.turn]

function withCurrent(g: PlayGame, f: (s: Seat) => Seat): Seat[] {
  return g.seats.map((s, i) => (i === g.turn ? f(s) : s))
}

export function canDraw(g: PlayGame, source: Source, cardId?: string): boolean {
  if (g.phase !== 'draw') return false
  if (source === 'remix') return g.remix.length > 0
  if (source === 'villain') return g.villain.length > 0
  return cardId !== undefined && g.discard.includes(cardId)
}

export function draw(g: PlayGame, source: Source, cardId?: string): PlayGame {
  if (!canDraw(g, source, cardId)) return g
  const who = current(g).name
  if (source === 'discard') {
    const id = cardId!
    const phase: Phase = id === 'cerebro' && cerebroSwaps({ ...g, discard: g.discard.filter(x => x !== id) }, [...current(g).hand, id]).length > 0
      ? 'cerebro'
      : 'discard'
    return {
      ...g,
      discard: g.discard.filter(x => x !== id),
      seats: withCurrent(g, s => ({ ...s, hand: [...s.hand, id] })),
      phase,
      taken: id,
      log: [...g.log, `${who} lấy ${nameOf(id)} từ khu bỏ bài.`],
    }
  }
  const deck = source === 'remix' ? g.remix : g.villain
  const id = deck[deck.length - 1]
  const rest = deck.slice(0, -1)
  return {
    ...g,
    [source]: rest,
    seats: withCurrent(g, s => ({ ...s, hand: [...s.hand, id] })),
    phase: 'discard',
    taken: undefined,
    log: [...g.log, `${who} rút 1 lá ${source === 'remix' ? 'REMIX' : 'VILLAIN'}.`],
  }
}

/** Cerebro: đổi 1 lá trên tay với 1 lá ở khu bỏ bài nếu một trong hai có Mutant. */
export function cerebroSwaps(g: PlayGame, hand: string[] = current(g).hand): [string, string][] {
  const mutant = (id: string) => hasTagAnyFace(getCard(id), 'Mutant')
  return hand
    .filter(h => h !== 'cerebro')
    .flatMap(h => g.discard.filter(d => mutant(h) || mutant(d)).map((d): [string, string] => [h, d]))
}

export function cerebroSwap(g: PlayGame, handId: string, discardId: string): PlayGame {
  if (g.phase !== 'cerebro' || !cerebroSwaps(g).some(([h, d]) => h === handId && d === discardId)) return g
  return {
    ...g,
    discard: g.discard.map(x => (x === discardId ? handId : x)),
    seats: withCurrent(g, s => ({ ...s, hand: s.hand.map(x => (x === handId ? discardId : x)) })),
    phase: 'discard',
    log: [...g.log, `${current(g).name} dùng Cerebro: đổi ${nameOf(handId)} lấy ${nameOf(discardId)}.`],
  }
}

export const skipCerebro = (g: PlayGame): PlayGame => (g.phase === 'cerebro' ? { ...g, phase: 'discard' } : g)

export const canDiscard = (g: PlayGame, cardId: string) =>
  g.phase === 'discard' && cardId !== g.taken && current(g).hand.includes(cardId)

export function discard(g: PlayGame, cardId: string): PlayGame {
  if (!canDiscard(g, cardId)) return g
  const next: PlayGame = {
    ...g,
    discard: [...g.discard, cardId],
    seats: withCurrent(g, s => ({ ...s, hand: s.hand.filter(x => x !== cardId) })),
    taken: undefined,
    log: [...g.log, `${current(g).name} bỏ ${nameOf(cardId)}.`],
  }
  if (next.discard.length >= g.discardLimit) return endGame(next, `Khu bỏ bài đủ ${g.discardLimit} lá — hết ván!`)
  // Hết cả hai chồng bài thì khu bỏ bài không thể tăng thêm: kết thúc luôn để ván không bị kẹt.
  if (next.remix.length === 0 && next.villain.length === 0) return endGame(next, 'Hết bài trong cả hai chồng — hết ván!')
  return { ...next, turn: (g.turn + 1) % g.seats.length, phase: 'draw' }
}

/** Hết ván: ai có Loki rút lá trên cùng của REMIX (lần lượt theo thứ tự ghế). */
function endGame(g: PlayGame, reason: string): PlayGame {
  const remix = [...g.remix]
  const seats = g.seats.map(s => (s.hand.includes('loki') && remix.length > 0 ? { ...s, lokiCard: remix.pop() } : s))
  const loki = seats.filter(s => s.lokiCard).map(s => `Loki của ${s.name} rút ${nameOf(s.lokiCard!)} (−${getCard(s.lokiCard!).power}).`)
  return { ...g, remix, seats, phase: 'over', log: [...g.log, reason, ...loki] }
}

export const lokiDraw = (s: Seat) => (s.lokiCard ? getCard(s.lokiCard).power : undefined)

// ---- lưu trữ ----
export const PLAY_STORAGE_KEY = 'marvel-remix-play/v1'

const validIds = (x: unknown): x is string[] => Array.isArray(x) && x.every(id => typeof id === 'string' && CARD_BY_ID.has(id))

export function parsePlayGame(raw: string | null | undefined): PlayGame | undefined {
  try {
    const g = raw ? (JSON.parse(raw) as PlayGame) : undefined
    if (!g || !validIds(g.remix) || !validIds(g.villain) || !validIds(g.discard) || !Array.isArray(g.seats)) return undefined
    if (!g.seats.every(s => typeof s?.id === 'string' && typeof s.name === 'string' && validIds(s.hand))) return undefined
    if (!['draw', 'cerebro', 'discard', 'over'].includes(g.phase) || !g.seats[g.turn] || !Array.isArray(g.log)) return undefined
    const all = [...g.remix, ...g.villain, ...g.discard, ...g.seats.flatMap(s => s.hand)]
    if (new Set(all).size !== all.length) return undefined
    return { ...g, discardLimit: clampLimit(g.discardLimit) }
  } catch {
    return undefined
  }
}
