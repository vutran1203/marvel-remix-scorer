import { MAX_PLAYERS, MIN_PLAYERS } from '../state/game'
import type { ScreenProps } from './types'

export function SetupScreen({ state, dispatch }: ScreenProps) {
  return (
    <main className="screen">
      <h1>Marvel Remix — Tính điểm</h1>
      <p className="hint">Nhập tên {MIN_PLAYERS}–{MAX_PLAYERS} người chơi.</p>
      <ul className="player-list">
        {state.players.map(p => (
          <li key={p.id}>
            <input
              aria-label="Tên người chơi"
              value={p.name}
              onChange={e => dispatch({ type: 'renamePlayer', id: p.id, name: e.target.value })}
            />
            <button
              className="icon"
              aria-label={`Xóa ${p.name}`}
              disabled={state.players.length <= MIN_PLAYERS}
              onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button disabled={state.players.length >= MAX_PLAYERS} onClick={() => dispatch({ type: 'addPlayer' })}>
          + Thêm người chơi
        </button>
        <button className="primary" onClick={() => dispatch({ type: 'start' })}>
          Bắt đầu tính điểm
        </button>
      </div>
    </main>
  )
}
