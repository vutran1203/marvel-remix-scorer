import { playBotTurn, evaluate } from '../../src/game/bot'
import { mulberry32 } from '../../src/game/rng'
import { current, newPlayGame, type PlayGame } from '../../src/game/state'

const allCards = (g: PlayGame) =>
  [...g.remix, ...g.villain, ...g.discard, ...g.seats.flatMap(s => s.hand), ...g.seats.flatMap(s => (s.lokiCard ? [s.lokiCard] : []))]

/** Cho người thật đánh bừa: rút REMIX, bỏ lá vừa rút. */
const humanTurn = (g: PlayGame) => {
  const top = g.remix[g.remix.length - 1]
  return { ...g, remix: g.remix.slice(0, -1), discard: [...g.discard, top], turn: (g.turn + 1) % g.seats.length }
}

describe('bot', () => {
  it.each(['easy', 'hard'] as const)('bot %s chơi hết ván hợp lệ', difficulty => {
    const rng = mulberry32(7)
    let g = newPlayGame({ name: 'Vũ', bots: 3, difficulty }, rng)
    for (let i = 0; i < 40 && g.phase !== 'over'; i++) {
      const before = g
      g = current(g).bot ? playBotTurn(g, rng) : humanTurn(g)
      expect(g).not.toBe(before)
      expect(new Set(allCards(g)).size).toBe(79)
      for (const s of g.seats) if (g.phase !== 'over' || !s.lokiCard) expect(s.hand).toHaveLength(7)
    }
    expect(g.phase).toBe('over')
  }, 60000)

  it('bot Khó lấy lá ở khu bỏ bài khi lá đó tăng điểm rõ', () => {
    let g = newPlayGame({ name: 'Vũ', bots: 1, difficulty: 'hard' }, mulberry32(3))
    const bot = g.seats[1]
    const hand = ['storm', 'cyclops', 'hawkeye', 'jean-grey', 'sauron', 'angel', 'forge']
    const rest = allCards(g).filter(id => !hand.includes(id) && id !== 'avoid-crossfire')
    g = {
      ...g,
      turn: 1,
      seats: [{ ...g.seats[0], hand: [] }, { ...bot, hand }],
      discard: ['avoid-crossfire'],
      remix: rest.filter(id => !id.match(/^(abomination|black-cat|hela|baron-zemo|juggernaut|kang|killmonger|kingpin|loki|magneto|mystique|selene|sentinels|taskmaster|the-leader|toad|ultron)$/)),
      villain: [],
    }
    const after = playBotTurn(g)
    expect(after.seats[1].hand).toContain('avoid-crossfire')
    expect(evaluate(after.seats[1].hand)).toBeGreaterThan(evaluate(hand))
  })
})
