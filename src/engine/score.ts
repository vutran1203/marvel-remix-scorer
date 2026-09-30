import { makeCtx } from './ctx'
import type { Scenario } from './resolve'
import type { Bonus, CardType, HandInput, LiveCard, Tag } from './types'

export interface CardResult {
  id: string
  name: string
  type: CardType
  tags: Tag[]
  transformed: boolean
  blanked: boolean
  blankedBy?: string
  power: number
  powerStar: boolean
  bonuses: Bonus[]
  total: number
}

export interface HandResult {
  total: number
  /** Tổng nếu bỏ qua điều kiện HERO/ALLY + VILLAIN. */
  rawTotal: number
  valid: boolean
  cards: CardResult[]
  /** Điểm không gắn với lá đang hoạt động (Loki). */
  extras: Bonus[]
  choiceLabels: string[]
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function scoreResolved(cards: LiveCard[], scenario: Scenario, input: HandInput): Omit<HandResult, 'choiceLabels'> {
  const active = cards.filter(c => !c.blanked)
  const valid =
    active.some(c => c.face.type === 'HERO' || c.face.type === 'ALLY') && active.some(c => c.face.type === 'VILLAIN')
  const results: CardResult[] = cards.map(c => {
    const base = {
      id: c.def.id,
      name: c.face.name,
      type: c.face.type,
      tags: c.tags,
      transformed: c.transformed,
      blanked: c.blanked,
      blankedBy: c.blankedBy,
      powerStar: !!c.face.powerStar && c.power === c.face.power,
    }
    if (c.blanked) return { ...base, power: 0, bonuses: [], total: 0 }
    const bonuses = c.def.rule.bonus?.(makeCtx(c, cards, scenario.choices, input)) ?? []
    return { ...base, power: c.power, bonuses, total: c.power + sum(bonuses.map(b => b.points)) }
  })
  const extras = cards.flatMap(c => c.def.rule.always?.(input) ?? [])
  const rawTotal = sum(results.map(r => r.total)) + sum(extras.map(b => b.points))
  return { valid, rawTotal, total: valid ? rawTotal : 0, cards: results, extras }
}
