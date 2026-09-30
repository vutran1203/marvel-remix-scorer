import { makeCtx } from '../../src/engine/ctx'
import { countTags, forEachPair, forEachTag, forEachType, pickTarget, targetOptions } from '../../src/engine/helpers'
import type { CardDef, LiveCard, Tag } from '../../src/engine/types'

const def = (id: string, type: CardDef['type'], tags: Tag[]): CardDef => ({
  id, number: 0, deck: 'REMIX', type, name: id, power: 0, tags, text: '', rule: {},
})
const live = (d: CardDef, blanked = false): LiveCard => ({ def: d, face: d, transformed: false, blanked, tags: [...d.tags], power: 0 })

const a = live(def('a', 'HERO', ['Tech', 'Tech']))
const b = live(def('b', 'ALLY', ['Tech', 'Intel']))
const c = live(def('c', 'LOCATION', ['Tech']), true)
const all = [a, b, c]
const ctxA = (choice?: unknown) => ({ ...makeCtx(a, all, {}, {}), choice })

describe('helpers', () => {
  it('countTags bỏ qua lá bị blank và có thể loại self', () => {
    expect(countTags(ctxA(), 'Tech')).toBe(3)
    expect(countTags(ctxA(), 'Tech', true)).toBe(1)
  })
  it('forEachTag / forEachType tạo bonus có lý do', () => {
    expect(forEachTag(2, ['Tech', 'Intel'])(ctxA())).toEqual([{ points: 8, reason: '+2 × 4 (Tech, Intel)' }])
    expect(forEachType(-3, 'HERO')(ctxA())).toEqual([{ points: -3, reason: '-3 × 1 HERO' }])
    expect(forEachTag(5, 'Boss')(ctxA())).toEqual([])
  })
  it('forEachPair lấy min của hai tag', () => {
    expect(forEachPair(13, 'Tech', 'Intel')(ctxA())).toEqual([{ points: 13, reason: '+13 × 1 cặp Tech+Intel' }])
  })
  it('pickTarget ưu tiên lựa chọn, nếu không có thì lấy lá đầu', () => {
    expect(pickTarget(ctxA('b'), [a, b])).toEqual([b])
    expect(pickTarget(ctxA('x'), [a, b])).toEqual([a])
    expect(pickTarget(ctxA('b'), [])).toEqual([])
  })
  it('targetOptions liệt kê lá khác đúng loại', () => {
    const hand = [a.def, b.def, c.def]
    expect(targetOptions(hand, a.def, ['HERO', 'ALLY'], 'blank')).toEqual([{ label: 'a: blank b', value: 'b' }])
  })
})
