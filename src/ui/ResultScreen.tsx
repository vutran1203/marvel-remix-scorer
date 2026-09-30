import { useMemo, useState } from 'react'
import { getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import type { HandResult } from '../engine/score'
import { rankPlayers } from '../state/game'
import type { ScreenProps } from './types'

function Breakdown({ result }: { result: HandResult }) {
  return (
    <div className="breakdown">
      {!result.valid && result.cards.length > 0 && (
        <p className="warning">Thiếu HERO/ALLY hoặc VILLAIN hợp lệ → 0 điểm (nếu hợp lệ sẽ là {result.rawTotal}).</p>
      )}
      <table>
        <thead>
          <tr><th>Lá</th><th>Power</th><th>Bonus</th><th>Điểm</th></tr>
        </thead>
        <tbody>
          {result.cards.map(c => (
            <tr key={c.id} className={c.blanked ? 'is-blanked' : ''}>
              <td>
                {c.name}
                {c.transformed && ' (transform)'}
                {c.blanked && ` — BLANK${c.blankedBy && c.blankedBy !== c.id ? ` bởi ${getCard(c.blankedBy).name}` : ''}`}
              </td>
              <td>{c.blanked ? '—' : c.powerStar ? '*' : c.power}</td>
              <td>{c.bonuses.map(b => <div key={b.reason}>{b.reason}</div>)}</td>
              <td>{c.total}</td>
            </tr>
          ))}
          {result.extras.map(b => (
            <tr key={b.reason}><td colSpan={3}>{b.reason}</td><td>{b.points}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}>Tổng</td><td>{result.total}</td></tr>
        </tfoot>
      </table>
      {result.choiceLabels.length > 0 && <p className="choices">Lựa chọn đã dùng: {result.choiceLabels.join('; ')}</p>}
    </div>
  )
}

export function ResultScreen({ state, dispatch }: ScreenProps) {
  const [open, setOpen] = useState<string | null>(null)
  const results = useMemo(
    () => new Map(state.players.map(p => [p.id, scoreHand(p.hand.map(getCard), { lokiDraw: p.lokiDraw })])),
    [state.players],
  )
  const ranked = rankPlayers(state.players.map(p => ({ id: p.id, total: results.get(p.id)!.total })))
  const nameOf = (id: string) => state.players.find(p => p.id === id)!.name

  return (
    <main className="screen">
      <h1>Kết quả</h1>
      <ol className="ranking">
        {ranked.map(({ id, rank, total, winner }) => (
          <li key={id} className={winner ? 'winner' : ''}>
            <button aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
              <span>#{rank}</span>
              <span>{nameOf(id)}</span>
              {winner && <span aria-label="Thắng">🏆</span>}
              <strong>{total}</strong>
            </button>
            {open === id && <Breakdown result={results.get(id)!} />}
          </li>
        ))}
      </ol>
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
