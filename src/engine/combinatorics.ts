export function* product<T>(lists: T[][]): Generator<T[]> {
  function* go(i: number, acc: T[]): Generator<T[]> {
    if (i === lists.length) {
      yield acc
      return
    }
    for (const x of lists[i]) yield* go(i + 1, [...acc, x])
  }
  yield* go(0, [])
}

export function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield [...items]
    return
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const p of permutations(rest)) yield [items[i], ...p]
  }
}

export function pairs<T>(items: T[]): [T, T][] {
  const out: [T, T][] = []
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]])
  return out
}
