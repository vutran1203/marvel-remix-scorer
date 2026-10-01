import { useEffect, useMemo, useState } from 'react'
import { getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import { playBotTurn } from '../game/bot'
import { runBot } from '../game/runBot'
import {
  DISCARD_LIMIT, MAX_BOTS, MAX_DISCARD_LIMIT, MIN_BOTS, MIN_DISCARD_LIMIT, PLAY_STORAGE_KEY, canDiscard, canDraw, cerebroSwap, cerebroSwaps, current, discard,
  draw, lokiDraw, newPlayGame, parsePlayGame, skipCerebro, type Difficulty, type NewGameOptions, type PlayGame,
} from '../game/state'
import { CardImage } from './CardImage'
import { Ranking } from './Ranking'

/** Chờ một chút trước lượt bot để người chơi kịp thấy chuyện gì xảy ra. */
const BOT_DELAY_MS = 700
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Dễ', hard: 'Khó' }

function load(): PlayGame | undefined {
  try {
    return parsePlayGame(window.localStorage.getItem(PLAY_STORAGE_KEY))
  } catch {
    return undefined
  }
}

function save(g: PlayGame | undefined) {
  try {
    if (g) window.localStorage.setItem(PLAY_STORAGE_KEY, JSON.stringify(g))
    else window.localStorage.removeItem(PLAY_STORAGE_KEY)
  } catch {
    // bộ nhớ bị chặn: vẫn chơi được, chỉ không lưu
  }
}

export function PlayMode() {
  const [game, setGame] = useState<PlayGame | undefined>(load)
  const [opts, setOpts] = useState<NewGameOptions>({ name: 'Bạn', bots: 2, difficulty: 'hard', discardLimit: DISCARD_LIMIT })
  useEffect(() => save(game), [game])

  if (!game) return <PlaySetup opts={opts} setOpts={setOpts} onStart={() => setGame(newPlayGame(opts))} />
  return (
    <PlayTable
      game={game}
      setGame={setGame}
      onNewGame={() => setGame(newPlayGame(opts))}
      onQuit={() => setGame(undefined)}
    />
  )
}

function PlaySetup({ opts, setOpts, onStart }: { opts: NewGameOptions; setOpts: (o: NewGameOptions) => void; onStart: () => void }) {
  return (
    <main className="screen">
      <h1>Chơi với máy</h1>
      <p className="hint">Mỗi lượt rút 1 lá (REMIX, VILLAIN hoặc khu bỏ bài) rồi bỏ 1 lá. Khu bỏ bài đủ {opts.discardLimit} lá thì hết ván.</p>
      <div className="play-setup">
        <label>
          Tên của bạn
          <input value={opts.name} onChange={e => setOpts({ ...opts, name: e.target.value })} />
        </label>
        <label>
          Số bot: <strong>{opts.bots}</strong>
          <input
            type="range"
            min={MIN_BOTS}
            max={MAX_BOTS}
            value={opts.bots}
            onChange={e => setOpts({ ...opts, bots: Number(e.target.value) })}
          />
        </label>
        <label>
          Số lá tối đa ở khu bỏ bài: <strong>{opts.discardLimit}</strong>
          {opts.discardLimit === DISCARD_LIMIT && <small className="hint"> (luật gốc)</small>}
          <input
            type="range"
            aria-label="Số lá tối đa ở khu bỏ bài"
            min={MIN_DISCARD_LIMIT}
            max={MAX_DISCARD_LIMIT}
            value={opts.discardLimit}
            onChange={e => setOpts({ ...opts, discardLimit: Number(e.target.value) })}
          />
        </label>
        <div className="segmented" role="radiogroup" aria-label="Độ khó">
          {(['easy', 'hard'] as const).map(d => (
            <button
              key={d}
              role="radio"
              aria-checked={opts.difficulty === d}
              className={opts.difficulty === d ? 'active' : ''}
              onClick={() => setOpts({ ...opts, difficulty: d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="primary" onClick={onStart}>Bắt đầu ván</button>
      </div>
    </main>
  )
}

interface TableProps {
  game: PlayGame
  setGame: (g: PlayGame) => void
  onNewGame: () => void
  onQuit: () => void
}

function PlayTable({ game, setGame, onNewGame, onQuit }: TableProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const me = game.seats[0]
  const turnSeat = current(game)
  const myTurn = turnSeat.id === me.id && game.phase !== 'over'
  const botThinking = !!turnSeat.bot && game.phase !== 'over'

  useEffect(() => {
    if (!botThinking) return
    let cancelled = false
    const t = setTimeout(() => {
      runBot(game)
        .catch(() => playBotTurn(game))
        .then(next => { if (!cancelled) setGame(next) })
    }, BOT_DELAY_MS)
    return () => { cancelled = true; clearTimeout(t) }
  }, [game, botThinking, setGame])

  useEffect(() => setSelected(null), [game.phase, game.turn])

  const result = useMemo(() => scoreHand(me.hand.map(getCard)), [me.hand])
  const afterDiscard = useMemo(
    () => (game.phase === 'discard' && myTurn && selected ? scoreHand(me.hand.filter(id => id !== selected).map(getCard)).total : undefined),
    [game.phase, myTurn, selected, me.hand],
  )
  const byId = new Map(result.cards.map(c => [c.id, c]))
  const swaps = myTurn && game.phase === 'cerebro' ? cerebroSwaps(game) : []

  if (game.phase === 'over') {
    return (
      <main className="screen">
        <h1>Hết ván!</h1>
        <Ranking entries={game.seats.map(s => ({ id: s.id, name: s.name, hand: s.hand, lokiDraw: lokiDraw(s) }))} />
        <GameLog log={game.log} open />
        <footer className="actions">
          <button onClick={onQuit}>Đổi thiết lập</button>
          <button className="primary" onClick={onNewGame}>Ván mới</button>
        </footer>
      </main>
    )
  }

  const status = botThinking
    ? `${turnSeat.name} đang nghĩ…`
    : game.phase === 'draw'
      ? 'Lượt của bạn — rút 1 lá từ REMIX, VILLAIN hoặc khu bỏ bài.'
      : game.phase === 'cerebro'
        ? 'Cerebro: chọn 1 lá trên tay rồi 1 lá ở khu bỏ bài để đổi (một trong hai phải có Mutant), hoặc bỏ qua.'
        : 'Chọn 1 lá để bỏ.'

  const onDiscardCard = (id: string) => {
    if (myTurn && game.phase === 'draw') setGame(draw(game, 'discard', id))
    else if (game.phase === 'cerebro' && selected) setGame(cerebroSwap(game, selected, id))
  }
  const discardClickable = (id: string) =>
    myTurn && (game.phase === 'draw' || (game.phase === 'cerebro' && !!selected && swaps.some(([h, d]) => h === selected && d === id)))
  const handClickable = (id: string) =>
    myTurn && (game.phase === 'discard' ? canDiscard(game, id) : game.phase === 'cerebro' && swaps.some(([h]) => h === id))

  return (
    <main className="screen play">
      <header className="play-header">
        <h1>Chơi với máy</h1>
        <button onClick={() => { if (window.confirm('Bỏ ván đang chơi?')) onQuit() }}>Thoát</button>
      </header>

      <ul className="opponents">
        {game.seats.slice(1).map(s => (
          <li key={s.id} className={s.id === turnSeat.id ? 'active' : ''}>
            {s.name} <small>({DIFFICULTY_LABEL[s.bot!]})</small> · {s.hand.length} lá
          </li>
        ))}
      </ul>

      <p className={`status ${myTurn ? 'is-mine' : ''}`} aria-live="polite">{status}</p>
      <ul className="recent">
        {game.log.slice(-3).map((line, i) => <li key={game.log.length - 3 + i}>{line}</li>)}
      </ul>

      <section className="board">
        <div className="piles">
          {(['remix', 'villain'] as const).map(src => (
            <button
              key={src}
              className={`pile pile-${src}`}
              disabled={!myTurn || !canDraw(game, src)}
              onClick={() => setGame(draw(game, src))}
            >
              <strong>{src === 'remix' ? 'REMIX' : 'VILLAIN'}</strong>
              <span>{(src === 'remix' ? game.remix : game.villain).length} lá</span>
            </button>
          ))}
        </div>
        <div className="discard-area">
          <h2>Khu bỏ bài {game.discard.length}/{game.discardLimit}</h2>
          {game.discard.length === 0 ? (
            <p className="hint">Chưa có lá nào.</p>
          ) : (
            <div className="play-grid">
              {game.discard.map(id => (
                <button
                  key={id}
                  className="play-card"
                  aria-disabled={!discardClickable(id)}
                  onClick={() => discardClickable(id) && onDiscardCard(id)}
                >
                  <CardImage card={getCard(id)} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="tray">
        <div className="tray-header">
          <h2>Tay bài của {me.name}</h2>
          <div className="live-score" aria-label="Điểm tạm tính">{result.total} điểm</div>
        </div>
        <div className="play-grid hand">
          {me.hand.map(id => {
            const r = byId.get(id)
            return (
              <button
                key={id}
                className={`play-card ${selected === id ? 'is-selected' : ''} ${r?.blanked ? 'is-blanked' : ''} ${id === game.taken ? 'is-new' : ''}`}
                aria-disabled={!handClickable(id)}
                onClick={() => handClickable(id) && setSelected(selected === id ? null : id)}
              >
                <CardImage card={getCard(id)} transformed={r?.transformed} />
                <span className="slot-score">{r?.total ?? 0}</span>
              </button>
            )
          })}
        </div>
        {!result.valid && <p className="warning">Cần ít nhất 1 HERO/ALLY và 1 VILLAIN (không bị blank), nếu không tay bài 0 điểm.</p>}
        {myTurn && game.phase === 'discard' && (
          <div className="actions">
            <button className="primary" disabled={!selected} onClick={() => selected && setGame(discard(game, selected))}>
              {selected ? `Bỏ ${getCard(selected).name} (còn ${afterDiscard} điểm)` : 'Chọn lá để bỏ'}
            </button>
          </div>
        )}
        {myTurn && game.phase === 'cerebro' && (
          <div className="actions">
            <button onClick={() => setGame(skipCerebro(game))}>Bỏ qua Cerebro</button>
          </div>
        )}
      </section>

      <GameLog log={game.log} />
    </main>
  )
}

function GameLog({ log, open = false }: { log: string[]; open?: boolean }) {
  return (
    <details className="game-log" open={open}>
      <summary>Nhật ký ván</summary>
      <ol reversed>
        {[...log].reverse().slice(0, 40).map((line, i) => <li key={log.length - i}>{line}</li>)}
      </ol>
    </details>
  )
}
