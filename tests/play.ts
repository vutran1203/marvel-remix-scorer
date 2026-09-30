import { getCard } from '../src/data'
import { scoreHand } from '../src/engine/optimize'
import type { CardResult, HandResult } from '../src/engine/score'
import type { HandInput } from '../src/engine/types'

export const play = (ids: string[], input: HandInput = {}): HandResult => scoreHand(ids.map(getCard), input)

export function cardOf(r: HandResult, id: string): CardResult {
  const c = r.cards.find(x => x.id === id)
  if (!c) throw new Error(`card ${id} not in result`)
  return c
}
