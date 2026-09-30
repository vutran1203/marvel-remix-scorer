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
