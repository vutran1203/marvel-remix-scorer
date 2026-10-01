import { permutations, product } from './combinatorics'
import { resolve } from './resolve'
import { scoreResolved, type HandResult } from './score'
import type { CardDef, HandInput, Option } from './types'

/** Giới hạn số phương án để giao diện không bị treo với tay bài cực nhiều lựa chọn. */
export const MAX_SCENARIOS = 200000

const NO_CHOICE: Option = { label: '', value: undefined }

export function scoreHand(defs: CardDef[], input: HandInput = {}): HandResult {
  const choiceCards = defs.filter(d => d.rule.choices)
  const lists = choiceCards.map(d => {
    const opts = d.rule.choices!(defs, d)
    return opts.length > 0 ? opts : [NO_CHOICE]
  })
  const blankers = defs.filter(d => d.rule.blank || d.rule.selfBlank).map(d => d.id)
  const orders = [...permutations(blankers)]

  let best: HandResult | undefined
  let n = 0
  let truncated = false
  outer: for (const combo of product(lists)) {
    const choices = Object.fromEntries(choiceCards.map((d, i) => [d.id, combo[i].value]))
    for (const order of orders) {
      if (n++ >= MAX_SCENARIOS) {
        truncated = true
        break outer
      }
      const scenario = { choices, order }
      const cards = resolve(defs, scenario, input)
      const r = scoreResolved(cards, scenario, input)
      if (!best || r.total > best.total || (r.total === best.total && r.rawTotal > best.rawTotal)) {
        const choiceLabels = combo.map(o => (typeof o.label === 'function' ? o.label(cards) : o.label)).filter(Boolean)
        best = { ...r, choiceLabels, truncated: false }
      }
    }
  }
  return { ...best!, truncated }
}
