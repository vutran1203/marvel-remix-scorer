import type { Dispatch } from 'react'
import type { Action, GameState } from '../state/game'

export interface ScreenProps {
  state: GameState
  dispatch: Dispatch<Action>
}
