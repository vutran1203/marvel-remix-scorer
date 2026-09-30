import { resolve, type Scenario } from '../../src/engine/resolve'
import { scoreResolved } from '../../src/engine/score'
import { STAGE, type CardDef, type Ctx } from '../../src/engine/types'

const fake = (id: string, over: Partial<CardDef> = {}): CardDef => ({
  id, number: 0, deck: 'REMIX', type: 'HERO', name: id, power: 1, tags: [], text: '', rule: {}, ...over,
})
const run = (defs: CardDef[], scenario: Partial<Scenario> = {}, input = {}) => {
  const s = { choices: {}, order: [], ...scenario }
  const cards = resolve(defs, s, input)
  return { cards, result: scoreResolved(cards, s, input) }
}
const countTech = (ctx: Ctx) => ctx.active.reduce((n, c) => n + c.tags.filter(t => t === 'Tech').length, 0)

describe('resolve + score', () => {
  it('cộng power khi có HERO và VILLAIN', () => {
    const { result } = run([fake('h', { power: 3 }), fake('v', { type: 'VILLAIN', power: 5 })])
    expect(result).toMatchObject({ valid: true, total: 8, rawTotal: 8 })
  })

  it('thiếu VILLAIN thì tổng = 0 nhưng vẫn giữ rawTotal', () => {
    const { result } = run([fake('h', { power: 3 })])
    expect(result).toMatchObject({ valid: false, total: 0, rawTotal: 3 })
  })

  it('lá tự blank không có điểm và tag của nó không được đếm', () => {
    const defs = [
      fake('a', { tags: ['Tech'], power: 4, rule: { selfBlank: () => true } }),
      fake('b', { rule: { bonus: ctx => [{ points: countTech(ctx), reason: 'tech' }] } }),
      fake('v', { type: 'VILLAIN', power: 0 }),
    ]
    const { cards, result } = run(defs, { order: ['a'] })
    expect(cards[0]).toMatchObject({ blanked: true, blankedBy: 'a' })
    expect(result.cards[0].total).toBe(0)
    expect(result.cards[1].total).toBe(1)
  })

  it('thứ tự blank: lá đã bị blank không blank được lá khác', () => {
    const defs = [
      fake('a', { rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'b') } }),
      fake('b', { rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'a') } }),
    ]
    const ab = run(defs, { order: ['a', 'b'] }).cards
    expect(ab.map(c => c.blanked)).toEqual([false, true])
    const ba = run(defs, { order: ['b', 'a'] }).cards
    expect(ba.map(c => c.blanked)).toEqual([true, false])
  })

  it('transform đổi mặt, power và tag', () => {
    const defs = [
      fake('t', {
        power: 1, tags: ['Gamma'],
        transform: { name: 'Big', type: 'HERO', power: 13, tags: ['Strength'], text: '' },
        rule: { transform: ctx => ctx.active.some(c => c !== ctx.self && c.tags.includes('Gamma')) },
      }),
      fake('g', { tags: ['Gamma'] }),
    ]
    const { cards } = run(defs)
    expect(cards[0]).toMatchObject({ transformed: true, power: 13, tags: ['Strength'] })
    expect(cards[0].face.name).toBe('Big')
  })

  it('tagMods chạy theo stage: ADD trước REMOVE', () => {
    const defs = [
      fake('remover', { rule: { tagMods: [{ stage: STAGE.REMOVE, apply: ctx => ctx.active.forEach(c => { c.tags = c.tags.filter(t => t !== 'Tech') }) }] } }),
      fake('adder', { rule: { tagMods: [{ stage: STAGE.ADD, apply: ctx => { ctx.self.tags.push('Tech') } }] } }),
    ]
    const { cards } = run(defs)
    expect(cards[1].tags).toEqual([])
  })

  it('always áp dụng kể cả khi lá bị blank', () => {
    const defs = [
      fake('l', { type: 'VILLAIN', power: 15, rule: { selfBlank: () => true, always: i => [{ points: -(i.lokiDraw ?? 0), reason: 'loki' }] } }),
      fake('v', { type: 'VILLAIN', power: 5 }),
      fake('h', { power: 2 }),
    ]
    const { result } = run(defs, { order: ['l'] }, { lokiDraw: 4 })
    expect(result.extras).toEqual([{ points: -4, reason: 'loki' }])
    expect(result.total).toBe(3)
  })

  it('power override (Rogue) áp dụng sau tag', () => {
    const defs = [fake('r', { power: 0, powerStar: true, rule: { power: () => 7 } }), fake('v', { type: 'VILLAIN', power: 0 })]
    const { result } = run(defs)
    expect(result.cards[0]).toMatchObject({ power: 7, powerStar: false, total: 7 })
  })
})
