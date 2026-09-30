import {
  HAND_SIZE, MAX_PLAYERS, STORAGE_KEY, handWarnings, initialState, loadState, ownerOf, rankPlayers, reducer,
  saveState, type Action, type GameState,
} from '../../src/state/game'
import { play } from '../play'

const apply = (actions: Action[], s: GameState = initialState()) => actions.reduce(reducer, s)
const memory = (init: Record<string, string> = {}) => {
  const data = { ...init }
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v }, data }
}

describe('reducer', () => {
  it('bắt đầu với 2 người, thêm tối đa 6, xóa tối thiểu còn 2', () => {
    let s = initialState()
    expect(s.players.map(p => p.name)).toEqual(['Người 1', 'Người 2'])
    for (let i = 0; i < 10; i++) s = reducer(s, { type: 'addPlayer' })
    expect(s.players).toHaveLength(MAX_PLAYERS)
    for (const p of [...s.players]) s = reducer(s, { type: 'removePlayer', id: p.id })
    expect(s.players).toHaveLength(2)
  })

  it('không cho 2 người giữ cùng 1 lá, không quá 7 lá', () => {
    let s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }, { type: 'selectPlayer', index: 1 }, { type: 'addCard', cardId: 'angel' }])
    expect(s.players[1].hand).toEqual([])
    expect(ownerOf(s, 'angel')?.id).toBe(s.players[0].id)
    const ids = ['beast', 'storm', 'hawkeye', 'falcon', 'cyclops', 'rogue', 'shuri', 'vision']
    for (const cardId of ids) s = reducer(s, { type: 'addCard', cardId })
    expect(s.players[1].hand).toHaveLength(HAND_SIZE)
  })

  it('xóa người chơi trả lại lá của họ', () => {
    let s = apply([{ type: 'addPlayer' }, { type: 'start' }, { type: 'selectPlayer', index: 2 }, { type: 'addCard', cardId: 'loki' }])
    s = reducer(s, { type: 'removePlayer', id: s.players[2].id })
    expect(ownerOf(s, 'loki')).toBeUndefined()
    expect(s.activePlayer).toBe(1)
  })

  it('ván mới xóa tay bài nhưng giữ tên', () => {
    let s = apply([{ type: 'renamePlayer', id: 'p1', name: 'Minh' }, { type: 'start' }, { type: 'addCard', cardId: 'angel' }, { type: 'setLokiDraw', value: 3 }])
    s = reducer(s, { type: 'newGame' })
    expect(s).toMatchObject({ screen: 'setup', activePlayer: 0 })
    expect(s.players[0]).toMatchObject({ name: 'Minh', hand: [], lokiDraw: undefined })
  })

  it('start điền tên mặc định cho tên trống', () => {
    const s = apply([{ type: 'renamePlayer', id: 'p2', name: '  ' }, { type: 'start' }])
    expect(s.players[1].name).toBe('Người 2')
    expect(s.screen).toBe('pick')
  })
})

describe('rankPlayers', () => {
  it('xếp hạng và hòa thì cùng thắng', () => {
    expect(rankPlayers([{ id: 'a', total: 10 }, { id: 'b', total: 30 }, { id: 'c', total: 30 }])).toEqual([
      { id: 'b', total: 30, rank: 1, winner: true },
      { id: 'c', total: 30, rank: 1, winner: true },
      { id: 'a', total: 10, rank: 3, winner: false },
    ])
  })
})

describe('handWarnings', () => {
  const player = (hand: string[], lokiDraw?: number) => ({ id: 'p1', name: 'A', hand, lokiDraw })
  it('cảnh báo thiếu VILLAIN / HERO-ALLY', () => {
    const hand = ['angel']
    expect(handWarnings(player(hand), play(hand))).toEqual(['Thiếu HERO/ALLY hoặc VILLAIN (không bị blank) → tay bài 0 điểm.'])
  })
  it('cảnh báo chưa nhập lá Loki rút', () => {
    const hand = ['loki', 'angel']
    expect(handWarnings(player(hand), play(hand))).toEqual(['Chưa nhập power lá Loki rút — đang tính là 0.'])
    expect(handWarnings(player(hand, 4), play(hand, { lokiDraw: 4 }))).toEqual([])
  })
  it('tay rỗng không cảnh báo', () => {
    expect(handWarnings(player([]), play([]))).toEqual([])
  })
})

describe('load/save', () => {
  it('lưu rồi đọc lại đúng trạng thái', () => {
    const store = memory()
    const s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }])
    saveState(s, store)
    expect(loadState(store)).toEqual(s)
  })
  it('JSON hỏng hoặc sai cấu trúc → ván mới', () => {
    expect(loadState(memory({ [STORAGE_KEY]: '{oops' }))).toEqual(initialState())
    expect(loadState(memory({ [STORAGE_KEY]: '{"players":[]}' }))).toEqual(initialState())
  })
  it('id lá không còn tồn tại bị loại bỏ', () => {
    const s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }])
    const raw = JSON.stringify({ ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, hand: ['angel', 'old-card'] } : p)) })
    expect(loadState(memory({ [STORAGE_KEY]: raw })).players[0].hand).toEqual(['angel'])
  })
  it('storage ném lỗi → không crash', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(loadState(broken)).toEqual(initialState())
    expect(() => saveState(initialState(), broken)).not.toThrow()
  })
})
