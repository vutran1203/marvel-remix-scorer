import { makeCtx } from './ctx'
import type { CardDef, HandInput, LiveCard } from './types'

export interface Scenario {
  /** Lựa chọn của từng lá, theo id lá. */
  choices: Record<string, unknown>
  /** Thứ tự kích hoạt các lá có hiệu ứng blank/selfBlank. */
  order: string[]
}

const MAX_TRANSFORM_PASSES = 5

function fresh(defs: CardDef[], transformed: Set<string>): LiveCard[] {
  return defs.map(def => {
    const isT = transformed.has(def.id) && def.transform !== undefined
    const face = isT ? def.transform! : def
    return { def, face, transformed: isT, blanked: false, tags: [...face.tags], power: face.power }
  })
}

/** Tính lại tag và power của mọi lá từ mặt hiện tại + tagMods của các lá đang hoạt động. */
export function computeTags(cards: LiveCard[], scenario: Scenario, input: HandInput): void {
  for (const c of cards) {
    c.tags = [...c.face.tags]
    c.power = c.face.power
  }
  const mods = cards
    .filter(c => !c.blanked)
    .flatMap(c => (c.def.rule.tagMods ?? []).map(mod => ({ c, mod })))
    .sort((a, b) => a.mod.stage - b.mod.stage)
  for (const { c, mod } of mods) mod.apply(makeCtx(c, cards, scenario.choices, input))
  for (const c of cards) {
    if (c.blanked || !c.def.rule.power) continue
    const p = c.def.rule.power(makeCtx(c, cards, scenario.choices, input))
    if (p !== undefined) c.power = p
  }
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x))

export function resolve(defs: CardDef[], scenario: Scenario, input: HandInput = {}): LiveCard[] {
  let transformed = new Set<string>()
  let cards: LiveCard[] = []
  for (let pass = 0; pass < MAX_TRANSFORM_PASSES; pass++) {
    cards = fresh(defs, transformed)
    computeTags(cards, scenario, input)
    for (const id of scenario.order) {
      const c = cards.find(x => x.def.id === id)
      if (!c || c.blanked) continue
      const ctx = makeCtx(c, cards, scenario.choices, input)
      if (c.def.rule.selfBlank?.(ctx)) {
        c.blanked = true
        c.blankedBy = c.def.id
      } else if (c.def.rule.blank) {
        for (const t of c.def.rule.blank(ctx)) {
          if (t.blanked) continue
          t.blanked = true
          t.blankedBy = c.def.id
        }
      }
      computeTags(cards, scenario, input)
    }
    const next = new Set(
      cards
        .filter(c => !c.blanked && c.def.transform && c.def.rule.transform?.(makeCtx(c, cards, scenario.choices, input)))
        .map(c => c.def.id),
    )
    if (sameSet(next, transformed)) break
    transformed = next
  }
  return cards
}
