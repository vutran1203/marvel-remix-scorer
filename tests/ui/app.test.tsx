import { fireEvent, render, screen } from '@testing-library/react'
import App from '../../src/App'

beforeEach(() => localStorage.clear())

describe('App', () => {
  it('màn thiết lập: thêm người chơi và bắt đầu', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Thêm người chơi'))
    expect(screen.getAllByLabelText('Tên người chơi')).toHaveLength(3)
    fireEvent.click(screen.getByText('Bắt đầu tính điểm'))
    expect(screen.getByText(/Tay bài của Người 1/)).toBeTruthy()
  })
})

describe('màn chọn bài', () => {
  const start = () => {
    render(<App />)
    fireEvent.click(screen.getByText('Bắt đầu tính điểm'))
  }

  it('chọn lá: vào khay, điểm tạm tính cập nhật, người khác không chọn được', () => {
    start()
    fireEvent.click(screen.getByRole('button', { name: 'Angel' }))
    expect(screen.getByLabelText('Điểm tạm tính').textContent).toBe('0 điểm')
    fireEvent.click(screen.getByRole('tab', { name: /VILLAIN/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Magneto' }))
    expect(screen.getByLabelText('Điểm tạm tính').textContent).toBe('23 điểm')
    fireEvent.click(screen.getByText(/Người 2 \(0\/7\)/))
    expect(screen.getByText('Đang ở tay Người 1')).toBeTruthy()
  })

  it('tìm theo tên trên mọi loại', () => {
    start()
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên…'), { target: { value: 'hulk' } })
    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label')).filter(Boolean)
    expect(names).toEqual(expect.arrayContaining(['Bruce Banner', 'She-Hulk', 'Hulk Operations']))
  })

  it('có Loki thì hiện ô nhập power lá rút', () => {
    start()
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên…'), { target: { value: 'loki' } })
    fireEvent.click(screen.getByRole('button', { name: 'Loki' }))
    expect(screen.getByLabelText(/Loki — power lá rút/)).toBeTruthy()
    expect(screen.getByText('Chưa nhập power lá Loki rút — đang tính là 0.')).toBeTruthy()
  })
})
