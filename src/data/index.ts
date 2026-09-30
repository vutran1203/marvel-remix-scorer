import type { CardDef } from '../engine/types'
import { ALLIES, HEROES } from './heroes'
import { CONDITIONS, EQUIPMENT, LOCATIONS, MANEUVERS } from './remix'
import { VILLAINS } from './villains'

export const CARDS: CardDef[] = [...HEROES, ...ALLIES, ...CONDITIONS, ...EQUIPMENT, ...LOCATIONS, ...MANEUVERS, ...VILLAINS]
export const CARD_BY_ID = new Map(CARDS.map(c => [c.id, c]))

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID.get(id)
  if (!c) throw new Error(`Unknown card: ${id}`)
  return c
}
