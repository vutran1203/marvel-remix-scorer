import { Ranking } from './Ranking'
import type { ScreenProps } from './types'

export function ResultScreen({ state, dispatch }: ScreenProps) {
  return (
    <main className="screen">
      <h1>Kết quả</h1>
      <Ranking entries={state.players} />
      <footer className="actions">
        <button onClick={() => dispatch({ type: 'editHands' })}>Sửa tay bài</button>
        <button
          className="primary"
          onClick={() => {
            if (window.confirm('Bắt đầu ván mới? Tay bài hiện tại sẽ bị xóa.')) dispatch({ type: 'newGame' })
          }}
        >
          Ván mới
        </button>
      </footer>
    </main>
  )
}
