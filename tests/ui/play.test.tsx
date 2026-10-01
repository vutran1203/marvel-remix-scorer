import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../../src/App'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
}

describe('chơi với máy', () => {
  it('bắt đầu ván, tới lượt mình thì rút REMIX và bỏ 1 lá', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Chơi với máy' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Dễ' }))
    fireEvent.click(screen.getByText('Bắt đầu ván'))
    expect(screen.getByText('Khu bỏ bài 0/10')).toBeTruthy()

    for (let i = 0; i < 5 && !screen.queryByText(/^Lượt của bạn/); i++) await flush()
    expect(screen.getByText(/^Lượt của bạn/)).toBeTruthy()

    const before = Number(/(\d+)\/10/.exec(screen.getByText(/^Khu bỏ bài/).textContent!)![1])
    fireEvent.click(screen.getByRole('button', { name: /REMIX/ }))
    expect(screen.getByText('Chọn 1 lá để bỏ.')).toBeTruthy()
    const hand = document.querySelectorAll('.play-grid.hand .play-card')
    expect(hand).toHaveLength(8)
    fireEvent.click(hand[0])
    fireEvent.click(screen.getByRole('button', { name: /^Bỏ .* điểm\)$/ }))
    expect(screen.getByText(`Khu bỏ bài ${before + 1}/10`)).toBeTruthy()
    expect(document.querySelectorAll('.play-grid.hand .play-card')).toHaveLength(7)
  })
})
