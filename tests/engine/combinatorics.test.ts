import { pairs, permutations, product } from '../../src/engine/combinatorics'

describe('product', () => {
  it('tạo tích Descartes', () => {
    expect([...product([[1, 2], [3]])]).toEqual([[1, 3], [2, 3]])
  })
  it('danh sách rỗng cho đúng 1 tổ hợp rỗng', () => {
    expect([...product<number>([])]).toEqual([[]])
  })
})

describe('permutations', () => {
  it('liệt kê đủ 6 hoán vị của 3 phần tử', () => {
    const all = [...permutations([1, 2, 3])].map(p => p.join(''))
    expect(new Set(all)).toEqual(new Set(['123', '132', '213', '231', '312', '321']))
  })
  it('mảng rỗng cho 1 hoán vị rỗng', () => {
    expect([...permutations([])]).toEqual([[]])
  })
})

describe('pairs', () => {
  it('liệt kê các cặp không lặp', () => {
    expect(pairs(['a', 'b', 'c'])).toEqual([['a', 'b'], ['a', 'c'], ['b', 'c']])
  })
})
