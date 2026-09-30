import type { ScreenProps } from './types'

export function PickScreen({ state }: ScreenProps) {
  return <main className="screen"><h2>Tay bài của {state.players[state.activePlayer].name}</h2></main>
}
