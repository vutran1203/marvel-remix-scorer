import { readFileSync } from 'node:fs'
import { CARDS } from '../../src/data'
import { CARD_TYPES, TAGS } from '../../src/engine/types'
import { play } from '../play'

describe('bộ bài', () => {
  it('79 lá: 61 REMIX + 18 VILLAIN, đúng số theo loại', () => {
    expect(CARDS).toHaveLength(79)
    expect(CARDS.filter(c => c.deck === 'REMIX')).toHaveLength(61)
    const byType = Object.fromEntries(CARD_TYPES.map(t => [t, CARDS.filter(c => c.type === t).length]))
    expect(byType).toEqual({ HERO: 23, ALLY: 7, CONDITION: 5, EQUIPMENT: 6, LOCATION: 13, MANEUVER: 7, VILLAIN: 18 })
  })

  it('id và number duy nhất, tag hợp lệ, VILLAIN chỉ ở bộ VILLAIN', () => {
    expect(new Set(CARDS.map(c => c.id)).size).toBe(79)
    expect(new Set(CARDS.map(c => c.number)).size).toBe(79)
    for (const c of CARDS) {
      for (const t of [...c.tags, ...(c.transform?.tags ?? [])]) expect(TAGS).toContain(t)
      expect(c.deck === 'VILLAIN').toBe(c.type === 'VILLAIN')
    }
  })

  it('lá không có text chỉ tính base power', () => {
    for (const c of CARDS.filter(c => c.text === '')) {
      expect(play([c.id]).cards[0].total).toBe(c.power)
    }
  })

  it('mỗi lá có đúng 1 ảnh trong scripts/card-images.json', () => {
    const map = JSON.parse(readFileSync('scripts/card-images.json', 'utf-8')) as Record<string, string>
    expect(Object.keys(map).sort()).toEqual(CARDS.map(c => c.id).sort())
    expect(new Set(Object.values(map)).size).toBe(79)
  })

  it('tay bài nhiều lựa chọn vẫn tính xong nhanh', () => {
    const start = performance.now()
    const r = play(['xavier-mansion', 'moira-mactaggert', 'rogue', 'shuri', 'vision', 'x-jet', 'selene'])
    expect(r.total).toBeGreaterThan(0)
    expect(performance.now() - start).toBeLessThan(3000)
  })
})
