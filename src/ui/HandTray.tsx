import type { Dispatch } from 'react'
import { getCard } from '../data'
import type { HandResult } from '../engine/score'
import { HAND_SIZE, handWarnings, type Action, type Player } from '../state/game'
import { CardImage } from './CardImage'

export function HandTray({ player, result, dispatch }: { player: Player; result: HandResult; dispatch: Dispatch<Action> }) {
  const byId = new Map(result.cards.map(c => [c.id, c]))
  const needsLoki = player.hand.some(id => getCard(id).rule.input === 'lokiDraw')
  return (
    <section className="tray">
      <div className="tray-header">
        <h2>Tay bài của {player.name}</h2>
        <div className="live-score" aria-label="Điểm tạm tính" aria-live="polite">{result.total} điểm</div>
      </div>
      <div className="slots">
        {Array.from({ length: HAND_SIZE }, (_, i) => {
          const id = player.hand[i]
          if (!id) return <div key={`empty-${i}`} className="slot empty" />
          const r = byId.get(id)
          return (
            <button
              key={id}
              className={`slot ${r?.blanked ? 'is-blanked' : ''}`}
              title="Bấm để bỏ lá khỏi tay"
              onClick={() => dispatch({ type: 'removeCard', cardId: id })}
            >
              <CardImage card={getCard(id)} transformed={r?.transformed} />
              <span className="slot-score">{r?.total ?? 0}</span>
            </button>
          )
        })}
      </div>
      {needsLoki && (
        <label className="loki">
          Loki — power lá rút từ REMIX:
          <input
            type="number"
            inputMode="numeric"
            value={player.lokiDraw ?? ''}
            onChange={e => dispatch({ type: 'setLokiDraw', value: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
      )}
      {handWarnings(player, result).map(w => (
        <p key={w} className="warning">{w}</p>
      ))}
    </section>
  )
}
