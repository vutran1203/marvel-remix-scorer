import { playBotTurn } from './bot'
import type { PlayGame } from './state'

self.onmessage = (e: MessageEvent<PlayGame>) => {
  self.postMessage(playBotTurn(e.data))
}
