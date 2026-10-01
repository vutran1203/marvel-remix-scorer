import { createContext, useCallback, useContext, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { CardDef, CardFace } from '../engine/types'
import { TYPE_COLORS } from './CardImage'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE_PX = 10

interface Preview {
  card: CardDef
  transformed: boolean
  /** hover: theo chuột, tự ẩn; pinned: nhấn giữ/chuột phải, bấm để đóng. */
  mode: 'hover' | 'pinned'
}

interface Api {
  show: (p: Preview) => void
  hideHover: () => void
}

const Ctx = createContext<Api>({ show: () => {}, hideHover: () => {} })

export function CardPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const show = useCallback((p: Preview) => setPreview(cur => (cur?.mode === 'pinned' && p.mode === 'hover' ? cur : p)), [])
  const hideHover = useCallback(() => setPreview(cur => (cur?.mode === 'hover' ? null : cur)), [])
  return (
    <Ctx.Provider value={{ show, hideHover }}>
      {children}
      {preview?.mode === 'hover' && (
        <aside className="card-preview is-hover" aria-hidden="true">
          <PreviewBody {...preview} />
        </aside>
      )}
      {preview?.mode === 'pinned' && (
        <div className="card-preview-backdrop" onClick={() => setPreview(null)}>
          <aside className="card-preview is-pinned" role="dialog" aria-label={`Thông tin ${preview.card.name}`}>
            <PreviewBody {...preview} />
            <button className="primary" onClick={() => setPreview(null)}>Đóng</button>
          </aside>
        </div>
      )}
    </Ctx.Provider>
  )
}

function Face({ face, title }: { face: CardFace; title?: string }) {
  return (
    <div className="preview-face">
      {title && <p className="preview-sub">{title}</p>}
      <h3>{face.name}</h3>
      <p className="preview-meta">
        <span className="type-badge" style={{ background: TYPE_COLORS[face.type] }}>{face.type}</span>
        <span>Power <strong>{face.powerStar ? '*' : face.power}</strong></span>
      </p>
      {face.tags.length > 0 && (
        <ul className="preview-tags">
          {face.tags.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
      <p className="preview-text">{face.text || <em>Không có hiệu ứng.</em>}</p>
    </div>
  )
}

function PreviewBody({ card, transformed }: Preview) {
  const front: CardFace = card
  const back = card.transform
  const [main, other] = transformed && back ? [back, front] : [front, back]
  return (
    <>
      <img
        className={`preview-img ${transformed && back ? 'is-transformed' : ''}`}
        src={`${import.meta.env.BASE_URL}cards/${card.id}.webp`}
        alt=""
      />
      <Face face={main} />
      {other && <Face face={other} title={transformed ? 'Mặt trước' : 'Mặt sau (khi transform)'} />}
    </>
  )
}

/** Gắn vào ảnh lá bài: rê chuột để xem, nhấn giữ (cảm ứng) hoặc chuột phải để ghim. */
export function useCardPreview(card: CardDef, transformed: boolean) {
  const api = useContext(Ctx)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const start = useRef({ x: 0, y: 0 })
  const fired = useRef(false)

  const cancel = () => clearTimeout(timer.current)
  const pin = () => api.show({ card, transformed, mode: 'pinned' })

  return {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') api.show({ card, transformed, mode: 'hover' })
    },
    onPointerLeave: (e: PointerEvent) => {
      cancel()
      if (e.pointerType === 'mouse') api.hideHover()
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      start.current = { x: e.clientX, y: e.clientY }
      cancel()
      fired.current = false
      timer.current = setTimeout(() => {
        fired.current = true
        pin()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: PointerEvent) => {
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE_PX) cancel()
    },
    onPointerUp: () => {
      cancel()
      if (fired.current) suppressNextClick()
      fired.current = false
    },
    onPointerCancel: cancel,
    onContextMenu: (e: { preventDefault: () => void }) => {
      e.preventDefault()
      cancel()
      pin()
    },
  }
}

/** Sau khi nhấn giữ, lần "click" lúc nhấc tay không được tính là chọn lá. */
function suppressNextClick() {
  const block = (e: Event) => {
    e.stopPropagation()
    e.preventDefault()
    window.removeEventListener('click', block, true)
  }
  window.addEventListener('click', block, true)
  setTimeout(() => window.removeEventListener('click', block, true), 600)
}
