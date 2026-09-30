import { useState, type CSSProperties } from 'react'
import { CARDS } from '../data'
import { CARD_TYPES, type CardDef, type CardType } from '../engine/types'
import { HAND_SIZE, ownerOf } from '../state/game'
import { CardImage, TYPE_COLORS } from './CardImage'
import type { ScreenProps } from './types'

const searchText = (c: CardDef) => `${c.name} ${c.transform?.name ?? ''}`.toLowerCase()
const byNumber = (a: CardDef, b: CardDef) => a.number - b.number

export function CardLibrary({ state, dispatch }: ScreenProps) {
  const [tab, setTab] = useState<CardType>('HERO')
  const [query, setQuery] = useState('')
  const player = state.players[state.activePlayer]
  const full = player.hand.length >= HAND_SIZE
  const q = query.trim().toLowerCase()
  const list = CARDS.filter(c => (q ? searchText(c).includes(q) : c.type === tab)).sort(byNumber)

  return (
    <section>
      <div className="library-controls">
        <input type="search" placeholder="Tìm theo tên…" value={query} onChange={e => setQuery(e.target.value)} />
        <nav className="type-tabs" role="tablist">
          {CARD_TYPES.map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={!q && tab === t}
              className={!q && tab === t ? 'active' : ''}
              style={{ '--type-color': TYPE_COLORS[t] } as CSSProperties}
              onClick={() => { setTab(t); setQuery('') }}
            >
              {t} <small>{CARDS.filter(c => c.type === t).length}</small>
            </button>
          ))}
        </nav>
        {full && <p className="hint">Tay bài đã đủ {HAND_SIZE} lá — bấm lá trong khay để bỏ bớt.</p>}
      </div>
      <div className="grid">
        {list.map(c => {
          const owner = ownerOf(state, c.id)
          return (
            <button
              key={c.id}
              aria-label={c.name}
              className={`lib-card ${owner ? 'is-taken' : ''}`}
              disabled={!!owner || full}
              onClick={() => dispatch({ type: 'addCard', cardId: c.id })}
            >
              <CardImage card={c} />
              {owner && <span className="taken-label">{owner.id === player.id ? 'Trong tay' : `Đang ở tay ${owner.name}`}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
