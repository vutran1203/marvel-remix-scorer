import { playBotTurn } from './bot'
import type { PlayGame } from './state'

let worker: Worker | undefined

function getWorker(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined
  try {
    worker ??= new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' })
    return worker
  } catch {
    return undefined
  }
}

/** Chạy lượt bot ngoài luồng giao diện (Web Worker); không có worker thì chạy trực tiếp. */
export function runBot(g: PlayGame): Promise<PlayGame> {
  const w = getWorker()
  if (!w) return new Promise(resolve => setTimeout(() => resolve(playBotTurn(g)), 0))
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<PlayGame>) => resolve(e.data)
    w.onerror = err => {
      worker = undefined
      reject(err)
    }
    w.postMessage(g)
  })
}
