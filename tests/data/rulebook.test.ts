import { cardOf, play } from '../play'

describe('ví dụ tính điểm trang 7', () => {
  const hand = ['captain-america', 'colossus', 'valkyrie', 'vision', 'mystique', 'vibranium-shield', 'falling-debris']

  it('từng lá khớp sách, riêng Falling Debris đếm cả Strength của Vibranium Shield', () => {
    const r = play(hand)
    expect(hand.map(id => cardOf(r, id).total)).toEqual([14, 6, 7, 3, 14, 9, 28])
  })

  it('tổng 81 (sách in 77 vì bỏ sót tag Strength của Vibranium Shield)', () => {
    expect(play(hand).total).toBe(81)
  })
})
