import { useEffect, useReducer, useState } from 'react'
import { loadState, reducer, saveState } from './state/game'
import { CardPreviewProvider } from './ui/CardPreview'
import { PickScreen } from './ui/PickScreen'
import { PlayMode } from './ui/PlayScreen'
import { ResultScreen } from './ui/ResultScreen'
import { SetupScreen } from './ui/SetupScreen'

type Mode = 'score' | 'play'
const MODE_KEY = 'marvel-remix/mode'

function loadMode(): Mode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'play' ? 'play' : 'score'
  } catch {
    return 'score'
  }
}

function ScoreMode() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState())
  useEffect(() => saveState(state), [state])
  const props = { state, dispatch }
  if (state.screen === 'pick') return <PickScreen {...props} />
  if (state.screen === 'result') return <ResultScreen {...props} />
  return <SetupScreen {...props} />
}

export default function App() {
  const [mode, setMode] = useState<Mode>(loadMode)
  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_KEY, mode)
    } catch {
      // bỏ qua
    }
  }, [mode])
  return (
    <CardPreviewProvider>
      <nav className="mode-tabs" role="tablist" aria-label="Chế độ">
        <button role="tab" aria-selected={mode === 'score'} className={mode === 'score' ? 'active' : ''} onClick={() => setMode('score')}>
          Tính điểm
        </button>
        <button role="tab" aria-selected={mode === 'play'} className={mode === 'play' ? 'active' : ''} onClick={() => setMode('play')}>
          Chơi với máy
        </button>
      </nav>
      {mode === 'play' ? <PlayMode /> : <ScoreMode />}
    </CardPreviewProvider>
  )
}
