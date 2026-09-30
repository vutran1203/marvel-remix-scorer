import { useMemo } from 'react'
import { getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import { HAND_SIZE } from '../state/game'
import { CardLibrary } from './CardLibrary'
import { HandTray } from './HandTray'
import type { ScreenProps } from './types'

export function PickScreen({ state, dispatch }: ScreenProps) {
  const player = state.players[state.activePlayer]
  const result = useMemo(
    () => scoreHand(player.hand.map(getCard), { lokiDraw: player.lokiDraw }),
    [player.hand, player.lokiDraw],
  )
  return (
    <main className="screen">
      <nav className="player-tabs">
        {state.players.map((p, i) => (
          <button
            key={p.id}
            className={i === state.activePlayer ? 'active' : ''}
            onClick={() => dispatch({ type: 'selectPlayer', index: i })}
          >
            {p.name} ({p.hand.length}/{HAND_SIZE})
          </button>
        ))}
      </nav>
      <HandTray player={player} result={result} dispatch={dispatch} />
      <CardLibrary state={state} dispatch={dispatch} />
      <footer className="actions">
        <button onClick={() => dispatch({ type: 'backToSetup' })}>← Người chơi</button>
        <button className="primary" onClick={() => dispatch({ type: 'showResults' })}>Xem kết quả</button>
      </footer>
    </main>
  )
}
