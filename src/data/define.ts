import type { CardDef, CardType, Rule } from '../engine/types'

export type CardInput = Omit<CardDef, 'deck' | 'type' | 'text' | 'rule'> & { text?: string; rule?: Rule }

const define = (deck: CardDef['deck'], type: CardType) => (c: CardInput): CardDef => ({
  text: '',
  rule: {},
  ...c,
  deck,
  type,
})

export const hero = define('REMIX', 'HERO')
export const ally = define('REMIX', 'ALLY')
export const condition = define('REMIX', 'CONDITION')
export const equipment = define('REMIX', 'EQUIPMENT')
export const location = define('REMIX', 'LOCATION')
export const maneuver = define('REMIX', 'MANEUVER')
export const villain = define('VILLAIN', 'VILLAIN')
