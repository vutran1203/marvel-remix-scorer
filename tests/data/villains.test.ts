import { VILLAINS } from '../../src/data/villains'
import { cardOf, play } from '../play'

describe('VILLAIN', () => {
  it('đủ 18 lá', () => expect(VILLAINS).toHaveLength(18))

  it.each([
    ['abomination', ['abomination'], -7],
    ['abomination', ['abomination', 'colossus'], 13],
    ['black-cat', ['black-cat', 'madripoor', 'hack-in'], 8],
    ['hela', ['hela', 'valkyrie'], -2],
    ['hela', ['hela', 'valkyrie', 'heimdall'], 18],
    ['baron-zemo', ['baron-zemo', 'hawkeye', 'falcon'], 9],
    ['juggernaut', ['juggernaut', 'madripoor'], 16],
    ['madripoor', ['juggernaut', 'madripoor'], 0],
    ['kang', ['kang', 'angel', 'hela'], 10],
    ['killmonger', ['killmonger', 'black-panther', 'shuri'], 9],
    ['kingpin', ['kingpin', 'madripoor'], 13],
    ['kingpin', ['kingpin'], 0],
    ['mystique', ['mystique', 'heimdall', 'black-widow'], 14],
    ['mystique', ['mystique', 'hawkeye'], -6],
    ['mystique', ['mystique', 'cyclops', 'storm'], 14],
    ['sentinels', ['sentinels', 'cyclops'], -8],
    ['sentinels', ['sentinels', 'cyclops', 'storm'], 12],
    ['hack-in', ['taskmaster', 'hack-in'], 0],
    ['the-leader', ['the-leader', 'colossus', 'she-hulk'], 0],
    ['toad', ['toad', 'magneto'], 14],
    ['toad', ['toad', 'black-cat'], 0],
    ['ultron', ['ultron'], -6],
  ])('%s trong %j = %i', (id, hand, expected) => {
    expect(cardOf(play(hand), id).total).toBe(expected)
  })

  it('Loki trừ power lá rút', () => {
    expect(play(['loki', 'hawkeye'], { lokiDraw: 7 }).total).toBe(13)
  })

  it('Loki bị blank vẫn trừ power lá rút (FAQ)', () => {
    const r = play(['loki', 'magneto', 'hidden-lair', 'captain-america'], { lokiDraw: 5 })
    expect(cardOf(r, 'loki').blanked).toBe(true)
    expect(r.total).toBe(32)
  })

  it('Magneto bỏ mọi Tech nên Hack In không có điểm', () => {
    const r = play(['magneto', 'hack-in', 'hawkeye'])
    expect(cardOf(r, 'hack-in').total).toBe(0)
    expect(r.total).toBe(22)
  })

  it('Selene blank HERO có lợi nhất và trừ power của nó', () => {
    expect(play(['selene', 'captain-america', 'black-widow']).total).toBe(27)
  })

  it('Juggernaut + Hidden Lair: chọn thứ tự để giữ VILLAIN', () => {
    const r = play(['juggernaut', 'hidden-lair', 'captain-america'])
    expect(r.total).toBe(20)
    expect(cardOf(r, 'hidden-lair').blanked).toBe(true)
  })
})
