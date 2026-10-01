import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../../src/App'

const startScoring = () => {
  render(<App />)
  fireEvent.click(screen.getByText('Bắt đầu tính điểm'))
}
const angelImg = () => screen.getByRole('button', { name: 'Angel' }).querySelector('img')!

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('xem thông tin lá', () => {
  it('rê chuột hiện thông tin, rời chuột thì ẩn', () => {
    startScoring()
    fireEvent.pointerEnter(angelImg(), { pointerType: 'mouse' })
    expect(document.querySelector('.card-preview.is-hover')?.textContent).toContain('HERO')
    fireEvent.pointerLeave(angelImg(), { pointerType: 'mouse' })
    expect(document.querySelector('.card-preview')).toBeNull()
  })

  it('chuột phải ghim thông tin, bấm Đóng để tắt', () => {
    startScoring()
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Black Panther' }).querySelector('img')!)
    expect(screen.getByRole('dialog').textContent).toContain('+5 for each other Wakanda.')
    fireEvent.click(screen.getByText('Đóng'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('nhấn giữ trên cảm ứng ghim thông tin và không chọn lá', () => {
    vi.useFakeTimers()
    startScoring()
    fireEvent.pointerDown(angelImg(), { pointerType: 'touch', clientX: 5, clientY: 5 })
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.pointerUp(angelImg(), { pointerType: 'touch' })
    fireEvent.click(screen.getByRole('button', { name: 'Angel' }))
    expect(screen.getByText(/Người 1 \(0\/7\)/)).toBeTruthy()
  })

  it('chạm nhanh vẫn chọn lá như cũ', () => {
    startScoring()
    fireEvent.pointerDown(angelImg(), { pointerType: 'touch' })
    fireEvent.pointerUp(angelImg(), { pointerType: 'touch' })
    fireEvent.click(screen.getByRole('button', { name: 'Angel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/Người 1 \(1\/7\)/)).toBeTruthy()
  })
})
