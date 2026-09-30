import type { Ctx, HandInput, LiveCard } from './types'

export function makeCtx(self: LiveCard, all: LiveCard[], choices: Record<string, unknown>, input: HandInput): Ctx {
  return { self, all, active: all.filter(c => !c.blanked), choice: choices[self.def.id], input }
}
