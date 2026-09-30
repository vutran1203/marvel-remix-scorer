import { useEffect, useReducer } from 'react'
import { loadState, reducer, saveState } from './state/game'
import { PickScreen } from './ui/PickScreen'
import { ResultScreen } from './ui/ResultScreen'
import { SetupScreen } from './ui/SetupScreen'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState())
  useEffect(() => saveState(state), [state])
  const props = { state, dispatch }
  if (state.screen === 'pick') return <PickScreen {...props} />
  if (state.screen === 'result') return <ResultScreen {...props} />
  return <SetupScreen {...props} />
}
