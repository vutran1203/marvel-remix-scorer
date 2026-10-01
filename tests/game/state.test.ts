import { mulberry32 } from '../../src/game/rng'
import {
  DISCARD_LIMIT, canDiscard, cerebroSwap, current, discard, draw, newPlayGame, parsePlayGame, skipCerebro, type PlayGame,
} from '../../src/game/state'
import { getCard } from '../../src/data'

const game = (bots = 2) => newPlayGame({ name: 'Vũ', bots, difficulty: 'hard' }, mulberry32(42))
const allCards = (g: PlayGame) => [...g.remix, ...g.villain, ...g.discard, ...g.seats.flatMap(s => s.hand)]

describe('chia bài', () => {
  it('mỗi người 6 REMIX + 1 VILLAIN, không trùng, đủ 79 lá', () => {
    const g = game(5)
    expect(g.seats).toHaveLength(6)
    for (const s of g.seats) {
      expect(s.hand).toHaveLength(7)
      expect(s.hand.filter(id => getCard(id).deck === 'VILLAIN')).toHaveLength(1)
    }
    expect(new Set(allCards(g)).size).toBe(79)
    expect(g.phase).toBe('draw')
  })
})

describe('lượt chơi', () => {
  it('rút REMIX rồi bỏ 1 lá → sang người kế', () => {
    const g = game()
    const top = g.remix[g.remix.length - 1]
    const a = draw(g, 'remix')
    expect(current(a).hand).toContain(top)
    expect(a.phase).toBe('discard')
    const b = discard(a, top)
    expect(b.discard).toEqual([top])
    expect(b.turn).toBe((g.turn + 1) % g.seats.length)
    expect(current(b).hand).toHaveLength(7)
    expect(new Set(allCards(b)).size).toBe(79)
  })

  it('lấy từ khu bỏ bài thì không được bỏ lại chính lá đó', () => {
    let g = game()
    g = discard(draw(g, 'remix'), g.remix[g.remix.length - 1])
    const card = g.discard[0]
    g = skipCerebro(draw(g, 'discard', card))
    expect(canDiscard(g, card)).toBe(false)
    expect(discard(g, card)).toBe(g)
  })

  it('không rút VILLAIN khi chồng đã hết', () => {
    const g = { ...game(), villain: [] }
    expect(draw(g, 'villain')).toBe(g)
  })

  it('khu bỏ bài đủ 10 lá thì hết ván', () => {
    let g = game()
    for (let i = 0; i < DISCARD_LIMIT; i++) {
      g = draw(g, 'remix')
      g = discard(g, current(g).hand[0])
    }
    expect(g.phase).toBe('over')
    expect(g.discard).toHaveLength(DISCARD_LIMIT)
  })

  it('Loki cuối ván rút lá trên cùng REMIX', () => {
    let g = game()
    const me = g.seats[g.turn]
    g = { ...g, seats: g.seats.map(s => (s === me ? { ...s, hand: [...s.hand.slice(0, 6), 'loki'] } : s)), villain: g.villain.filter(v => v !== 'loki') }
    g = { ...g, discard: g.remix.slice(0, 9), remix: g.remix.slice(9) }
    const nextTop = g.remix[g.remix.length - 2]
    g = discard(draw(g, 'remix'), current(draw(g, 'remix')).hand[0])
    expect(g.phase).toBe('over')
    expect(g.seats.find(s => s.id === me.id)!.lokiCard).toBe(nextTop)
  })
})

describe('Cerebro', () => {
  it('lấy Cerebro từ khu bỏ bài được đổi 1 lá có Mutant', () => {
    let g = game()
    const seat = current(g)
    const hand = ['storm', 'angel', 'hawkeye', 'falcon', 'valkyrie', 'vision', 'sauron']
    const others = allCards(g).filter(id => !hand.includes(id) && id !== 'cerebro' && id !== 'cyclops')
    g = {
      ...g,
      seats: g.seats.map(s => (s === seat ? { ...s, hand } : { ...s, hand: [] })),
      discard: ['cerebro', 'cyclops'],
      remix: others.filter(id => getCard(id).deck === 'REMIX'),
      villain: others.filter(id => getCard(id).deck === 'VILLAIN'),
    }
    g = draw(g, 'discard', 'cerebro')
    expect(g.phase).toBe('cerebro')
    expect(cerebroSwap(g, 'hawkeye', 'falcon')).toBe(g)
    g = cerebroSwap(g, 'hawkeye', 'cyclops')
    expect(g.phase).toBe('discard')
    expect(current(g).hand).toContain('cyclops')
    expect(g.discard).toEqual(['hawkeye'])
  })
})

describe('lưu trữ', () => {
  it('đọc lại được ván đã lưu, bỏ qua dữ liệu hỏng', () => {
    const g = game()
    expect(parsePlayGame(JSON.stringify(g))).toEqual(g)
    expect(parsePlayGame('{bad')).toBeUndefined()
    expect(parsePlayGame(JSON.stringify({ ...g, discard: [g.remix[0]] }))).toBeUndefined()
  })
})
