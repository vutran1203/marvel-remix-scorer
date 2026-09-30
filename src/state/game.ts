import { CARD_BY_ID, getCard } from '../data'
import type { HandResult } from '../engine/score'

export const HAND_SIZE = 7
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const STORAGE_KEY = 'marvel-remix-scorer/v1'

export type Screen = 'setup' | 'pick' | 'result'

export interface Player {
  id: string
  name: string
  hand: string[]
  lokiDraw?: number
}

export interface GameState {
  screen: Screen
  players: Player[]
  activePlayer: number
  nextId: number
}

export type Action =
  | { type: 'addPlayer' }
  | { type: 'removePlayer'; id: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'start' }
  | { type: 'backToSetup' }
  | { type: 'selectPlayer'; index: number }
  | { type: 'addCard'; cardId: string }
  | { type: 'removeCard'; cardId: string }
  | { type: 'setLokiDraw'; value: number | undefined }
  | { type: 'showResults' }
  | { type: 'editHands' }
  | { type: 'newGame' }

const defaultName = (n: number) => `Người ${n}`
const newPlayer = (n: number): Player => ({ id: `p${n}`, name: defaultName(n), hand: [] })

export function initialState(): GameState {
  return { screen: 'setup', players: [newPlayer(1), newPlayer(2)], activePlayer: 0, nextId: 3 }
}

export const ownerOf = (state: GameState, cardId: string) => state.players.find(p => p.hand.includes(cardId))

function updateActive(state: GameState, f: (p: Player) => Player): GameState {
  return { ...state, players: state.players.map((p, i) => (i === state.activePlayer ? f(p) : p)) }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'addPlayer':
      if (state.players.length >= MAX_PLAYERS) return state
      return { ...state, players: [...state.players, newPlayer(state.nextId)], nextId: state.nextId + 1 }
    case 'removePlayer': {
      if (state.players.length <= MIN_PLAYERS) return state
      const players = state.players.filter(p => p.id !== action.id)
      return { ...state, players, activePlayer: Math.min(state.activePlayer, players.length - 1) }
    }
    case 'renamePlayer':
      return { ...state, players: state.players.map(p => (p.id === action.id ? { ...p, name: action.name } : p)) }
    case 'start':
      return {
        ...state,
        screen: 'pick',
        players: state.players.map((p, i) => ({ ...p, name: p.name.trim() || defaultName(i + 1) })),
      }
    case 'backToSetup':
      return { ...state, screen: 'setup' }
    case 'selectPlayer':
      return { ...state, activePlayer: Math.max(0, Math.min(action.index, state.players.length - 1)) }
    case 'addCard': {
      const p = state.players[state.activePlayer]
      if (p.hand.length >= HAND_SIZE || ownerOf(state, action.cardId) || !CARD_BY_ID.has(action.cardId)) return state
      return updateActive(state, pl => ({ ...pl, hand: [...pl.hand, action.cardId] }))
    }
    case 'removeCard':
      return updateActive(state, pl => ({ ...pl, hand: pl.hand.filter(id => id !== action.cardId) }))
    case 'setLokiDraw':
      return updateActive(state, pl => ({ ...pl, lokiDraw: action.value }))
    case 'showResults':
      return { ...state, screen: 'result' }
    case 'editHands':
      return { ...state, screen: 'pick' }
    case 'newGame':
      return {
        ...state,
        screen: 'setup',
        activePlayer: 0,
        players: state.players.map(p => ({ ...p, hand: [], lokiDraw: undefined })),
      }
  }
}

export function rankPlayers(scores: { id: string; total: number }[]) {
  const sorted = [...scores].sort((a, b) => b.total - a.total)
  const top = sorted[0]?.total
  return sorted.map(s => ({
    ...s,
    rank: 1 + sorted.filter(o => o.total > s.total).length,
    winner: s.total === top,
  }))
}

export function handWarnings(player: Player, result: HandResult): string[] {
  const out: string[] = []
  if (player.hand.length > 0 && !result.valid) out.push('Thiếu HERO/ALLY hoặc VILLAIN (không bị blank) → tay bài 0 điểm.')
  const needsLoki = player.hand.some(id => getCard(id).rule.input === 'lokiDraw')
  if (result.truncated) out.push('Tay bài có quá nhiều lựa chọn — điểm có thể chưa phải cao nhất.')
  if (needsLoki && player.lokiDraw === undefined) out.push('Chưa nhập power lá Loki rút — đang tính là 0.')
  return out
}

// ---- lưu trữ ----
type Store = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): Store | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function sanitize(raw: unknown): GameState | undefined {
  const s = raw as Partial<GameState> | null
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS) return undefined
  if (s.screen !== 'setup' && s.screen !== 'pick' && s.screen !== 'result') return undefined
  const seen = new Set<string>()
  const players: Player[] = []
  for (const p of s.players) {
    if (typeof p?.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.hand)) return undefined
    const hand = p.hand.filter(id => typeof id === 'string' && CARD_BY_ID.has(id) && !seen.has(id)).slice(0, HAND_SIZE)
    hand.forEach(id => seen.add(id))
    players.push({ id: p.id, name: p.name, hand, lokiDraw: typeof p.lokiDraw === 'number' ? p.lokiDraw : undefined })
  }
  const activePlayer = Number.isInteger(s.activePlayer) ? Math.min(Math.max(0, s.activePlayer!), players.length - 1) : 0
  const nextId = Number.isInteger(s.nextId) ? s.nextId! : players.length + 1
  return { screen: s.screen, players, activePlayer, nextId }
}

export function loadState(store: Store | undefined = defaultStore()): GameState {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    return (raw && sanitize(JSON.parse(raw))) || initialState()
  } catch {
    return initialState()
  }
}

export function saveState(state: GameState, store: Store | undefined = defaultStore()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // bộ nhớ bị chặn/đầy: bỏ qua, ván vẫn chơi được
  }
}
