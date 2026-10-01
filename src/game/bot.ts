import { CARDS, getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import type { Rng } from './rng'
import { canDraw, current, discard, draw, skipCerebro, type Difficulty, type PlayGame } from './state'

/** Bot không biết lá Loki sẽ rút: dùng power trung bình của bộ REMIX. */
const AVG_REMIX_POWER = Math.round(
  CARDS.filter(c => c.deck === 'REMIX').reduce((n, c) => n + c.power, 0) / CARDS.filter(c => c.deck === 'REMIX').length,
)
/** Tay chưa hợp lệ vẫn cần hướng đi: lấy điểm thô trừ phạt. */
const INVALID_PENALTY = 40
/** Chỉ lấy lá ở khu bỏ bài nếu tay bài tăng ít nhất ngần này điểm. */
const TAKE_THRESHOLD: Record<Difficulty, number> = { hard: 3, easy: 8 }
/** Bot "Dễ" chỉ để ý tới khu bỏ bài với xác suất này. */
const EASY_LOOKS_AT_DISCARD = 0.5
/** Bot "Dễ" bỏ lá tốt nhất với xác suất này, còn lại bỏ ngẫu nhiên. */
const EASY_SMART = 0.7

export function evaluate(hand: string[], cache: Map<string, number> = new Map()): number {
  const key = [...hand].sort().join(',')
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const r = scoreHand(hand.map(getCard), { lokiDraw: AVG_REMIX_POWER })
  const v = r.valid ? r.total : r.rawTotal - INVALID_PENALTY
  cache.set(key, v)
  return v
}

/** Lá nên bỏ để phần còn lại nhiều điểm nhất. */
export function bestDiscard(hand: string[], keep: string | undefined, cache: Map<string, number>): { card: string; value: number } {
  let best = { card: '', value: -Infinity }
  for (const c of hand) {
    if (c === keep) continue
    const v = evaluate(hand.filter(x => x !== c), cache)
    if (v > best.value) best = { card: c, value: v }
  }
  return best
}

const hasVillain = (hand: string[]) => hand.some(id => getCard(id).type === 'VILLAIN')

/** Chơi trọn 1 lượt cho bot đang tới lượt; chỉ dùng thông tin công khai + tay của bot. */
export function playBotTurn(g: PlayGame, rng: Rng = Math.random): PlayGame {
  const seat = current(g)
  if (!seat.bot || g.phase !== 'draw') return g
  const cache = new Map<string, number>()
  const blind: 'remix' | 'villain' = !hasVillain(seat.hand) && canDraw(g, 'villain') ? 'villain' : canDraw(g, 'remix') ? 'remix' : 'villain'

  let pick: { card: string; value: number } | undefined
  if (seat.bot === 'hard' || rng() < EASY_LOOKS_AT_DISCARD) {
    const now = evaluate(seat.hand, cache)
    for (const d of g.discard) {
      const v = bestDiscard([...seat.hand, d], d, cache).value
      if (v >= now + TAKE_THRESHOLD[seat.bot] && (!pick || v > pick.value)) pick = { card: d, value: v }
    }
  }
  let next = pick ? draw(g, 'discard', pick.card) : draw(g, blind)
  if (next === g) return g
  next = skipCerebro(next)

  const hand = current(next).hand
  const smart = seat.bot === 'hard' || rng() < EASY_SMART
  const choices = hand.filter(c => c !== next.taken)
  const out = smart ? bestDiscard(hand, next.taken, cache).card : choices[Math.floor(rng() * choices.length)]
  return discard(next, out)
}
