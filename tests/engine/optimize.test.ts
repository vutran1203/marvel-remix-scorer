import { MAX_SCENARIOS, scoreHand } from '../../src/engine/optimize'
import type { CardDef } from '../../src/engine/types'

const fake = (id: string, over: Partial<CardDef> = {}): CardDef => ({
  id, number: 0, deck: 'REMIX', type: 'HERO', name: id, power: 0, tags: [], text: '', rule: {}, ...over,
})
const villain = fake('v', { type: 'VILLAIN' })

describe('scoreHand', () => {
  it('tay rỗng: 0 điểm, không hợp lệ, không lỗi', () => {
    expect(scoreHand([])).toMatchObject({ total: 0, rawTotal: 0, valid: false, cards: [] })
  })

  it('chọn lựa chọn cho điểm cao nhất và ghi nhãn', () => {
    const chooser = fake('c', {
      rule: {
        choices: () => [{ label: 'thấp', value: 1 }, { label: 'cao', value: 5 }],
        bonus: ctx => [{ points: ctx.choice as number, reason: 'chọn' }],
      },
    })
    const r = scoreHand([chooser, villain])
    expect(r.total).toBe(5)
    expect(r.choiceLabels).toEqual(['cao'])
  })

  it('chọn thứ tự blank tốt nhất', () => {
    const a = fake('a', { power: 10, rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'b') } })
    const b = fake('b', { power: 1, rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'a') } })
    expect(scoreHand([a, b, villain]).total).toBe(10)
  })

  it('dừng ở MAX_SCENARIOS khi quá nhiều lựa chọn', () => {
    const many = fake('m', {
      rule: {
        choices: () => Array.from({ length: MAX_SCENARIOS + 10000 }, (_, i) => ({ label: `${i}`, value: i })),
        bonus: ctx => [{ points: ctx.choice as number, reason: 'n' }],
      },
    })
    const r = scoreHand([many, villain])
    expect(r.total).toBe(MAX_SCENARIOS - 1)
    expect(r.truncated).toBe(true)
  })

  it('lá có choices nhưng không có lựa chọn nào vẫn tính được', () => {
    const empty = fake('e', { power: 2, rule: { choices: () => [] } })
    expect(scoreHand([empty, villain])).toMatchObject({ total: 2, truncated: false })
  })
})
