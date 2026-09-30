# Marvel Remix Scorer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web tĩnh (dùng chung 1 máy) để chọn 7 lá của từng người chơi Marvel: Remix, tự tính điểm tối ưu có giải thích, xếp hạng.

**Architecture:** Engine TypeScript thuần (`src/engine`) giải một tay bài theo pha (tag → blank theo thứ tự → transform → cộng điểm) và thử mọi lựa chọn/thứ tự blank để lấy tổng cao nhất. Dữ liệu 79 lá ở `src/data` (thông tin tĩnh + luật ghép từ hàm trợ giúp). UI React 1 trang, 3 màn (Thiết lập / Chọn bài / Kết quả), trạng thái lưu localStorage. Ảnh lá được xử lý 1 lần bằng Python/OpenCV thành WebP.

**Tech Stack:** Vite, React, TypeScript, Vitest + jsdom + @testing-library/react, Python 3.11 + opencv-python-headless (script ảnh), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-30-marvel-remix-scorer-design.md`

## Global Constraints

- Giao diện tiếng Việt; tên lá, loại (HERO/ALLY/…) và tag giữ tiếng Anh như trên bài.
- 2–6 người chơi; mỗi tay tối đa 7 lá; mỗi lá chỉ nằm trong tay 1 người.
- Bộ bài: 61 REMIX (23 HERO, 7 ALLY, 5 CONDITION, 6 EQUIPMENT, 13 LOCATION, 7 MANEUVER) + 18 VILLAIN = 79.
- Tay bài phải có ≥1 HERO/ALLY và ≥1 VILLAIN không bị blank, nếu không tổng = 0.
- Base power `*` = 0. Loki trừ power lá rút kể cả khi Loki bị blank.
- Engine không phụ thuộc React; mọi hàm luật là thuần (chỉ đọc/ghi `LiveCard.tags` trong `tagMods`).
- Không backend; chỉ localStorage (bọc try/catch).
- Ảnh gốc `image/`, `huongdan/` không commit, không đưa vào build.
- Ví dụ trang 7 sách in **77**, nhưng Vibranium Shield thật có tag Strength ⇒ Falling Debris = 28, tổng đúng luật = **81**. Test dùng 81.

## Review Focus

1. **localStorage hỏng / phiên bản cũ / id lá không tồn tại** → mở web không crash, quay về ván mới. Test: Task 8 `loadState` với JSON rác và id lạ.
2. **Tay bài nhiều lá có lựa chọn** (Xavier Mansion + Moira + Rogue + Shuri + Vision + X-Jet + Selene) → không treo giao diện, trả kết quả trong giới hạn `MAX_SCENARIOS`. Test: Task 3 (lá giả 30 000 lựa chọn) và Task 6 (tay thật, < 3 s).
3. **Tay bài rỗng hoặc chưa đủ 7 lá** (tính thử giữa ván) → vẫn tính, không lỗi. Test: Task 3 tay rỗng; Task 11 smoke test chọn 1 lá.
4. **Có Loki nhưng chưa nhập power lá rút** → tính như 0 và hiện cảnh báo. Test: Task 8 `handWarnings`.
5. **Xóa người chơi / ván mới** → các lá họ giữ được trả lại cho người khác chọn. Test: Task 8 reducer.

---

## File Structure

```
.gitignore
package.json, tsconfig.json, vite.config.ts, index.html
.github/workflows/deploy.yml
scripts/requirements.txt
scripts/card-images.json        # { cardId: hash8 của ảnh gốc }
scripts/process_images.py
public/cards/<id>.webp          # 79 ảnh đã xử lý (commit)
src/engine/types.ts             # kiểu dữ liệu + STAGE
src/engine/combinatorics.ts     # product, permutations, pairs
src/engine/ctx.ts               # makeCtx
src/engine/resolve.ts           # giải 1 phương án: tag/blank/transform
src/engine/score.ts             # cộng điểm 1 phương án đã giải
src/engine/optimize.ts          # scoreHand: thử mọi phương án, lấy tốt nhất
src/engine/helpers.ts           # hàm trợ giúp viết luật
src/data/define.ts              # hero(), ally(), … tạo CardDef
src/data/heroes.ts              # 23 HERO + 7 ALLY
src/data/remix.ts               # CONDITION, EQUIPMENT, LOCATION, MANEUVER
src/data/villains.ts            # 18 VILLAIN
src/data/index.ts               # CARDS, CARD_BY_ID, getCard
src/state/game.ts               # reducer, ownerOf, rankPlayers, handWarnings, load/save
src/ui/CardImage.tsx
src/ui/SetupScreen.tsx
src/ui/PickScreen.tsx           # gồm HandTray + CardLibrary
src/ui/HandTray.tsx
src/ui/CardLibrary.tsx
src/ui/ResultScreen.tsx         # gồm Breakdown
src/ui/types.ts                 # ScreenProps
src/App.tsx, src/main.tsx, src/styles.css
tests/engine/*.test.ts
tests/data/*.test.ts
tests/state/game.test.ts
tests/ui/app.test.tsx
tests/play.ts                   # helper test: play(ids, input), cardOf(result, id)
```

---

### Task 1: Khung dự án + kiểu dữ liệu + tổ hợp

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx` (tạm), `src/engine/types.ts`, `src/engine/combinatorics.ts`
- Test: `tests/engine/combinatorics.test.ts`

**Interfaces:**
- Produces: toàn bộ kiểu trong `types.ts` (`Tag`, `TAGS`, `CardType`, `CARD_TYPES`, `CardFace`, `CardDef`, `LiveCard`, `Ctx`, `Rule`, `TagMod`, `Bonus`, `Option`, `HandInput`, `STAGE`); `product<T>(lists: T[][]): Generator<T[]>`, `permutations<T>(items: T[]): Generator<T[]>`, `pairs<T>(items: T[]): [T, T][]`.

- [ ] **Step 1: Đổi nhánh sang `main` và tạo file cấu hình**

```bash
git branch -M main
```

`.gitignore`:
```
node_modules/
dist/
image/
huongdan/
scripts/contact-sheet.jpg
__pycache__/
```

`package.json`:
```json
{
  "name": "marvel-remix-scorer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

Cài thư viện (npm tự chọn bản mới nhất):
```bash
npm i react react-dom
npm i -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @types/react @types/react-dom @types/node
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client", "vitest/globals", "node"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
})
```

`index.html`:
```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Marvel Remix — Tính điểm</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (tạm, thay ở Task 9):
```tsx
export default function App() {
  return <main>Marvel Remix — Tính điểm</main>
}
```

`src/styles.css` (tạm, thay ở Task 9):
```css
body { margin: 0; font-family: system-ui, sans-serif; }
```

- [ ] **Step 2: Viết `src/engine/types.ts`**

```ts
export const TAGS = [
  'Tech', 'Intel', 'Strength', 'Agility', 'Flight', 'Range', 'Wakanda',
  'Asgard', 'Mutant', 'Gamma', 'Worthy', 'Urban', 'Boss',
] as const
export type Tag = (typeof TAGS)[number]

export const CARD_TYPES = ['HERO', 'ALLY', 'CONDITION', 'EQUIPMENT', 'LOCATION', 'MANEUVER', 'VILLAIN'] as const
export type CardType = (typeof CARD_TYPES)[number]

/** Thứ tự áp dụng tagMods: thêm → lấp Flight (X-Jet) → nhân đôi → xóa (Magneto) → quy đổi (Hack In). */
export const STAGE = { ADD: 10, FILL: 20, DOUBLE: 30, REMOVE: 40, ALIAS: 50 } as const

export interface CardFace {
  name: string
  type: CardType
  power: number
  /** Power in là "*" (tính 0). */
  powerStar?: boolean
  /** Lặp tag nếu lá in 2 icon giống nhau. */
  tags: Tag[]
  text: string
}

export interface CardDef extends CardFace {
  id: string
  number: number
  deck: 'REMIX' | 'VILLAIN'
  /** Mặt sau khi transform. */
  transform?: CardFace
  rule: Rule
}

/** Trạng thái 1 lá trong lúc giải 1 phương án. */
export interface LiveCard {
  def: CardDef
  face: CardFace
  transformed: boolean
  blanked: boolean
  /** id lá đã blank lá này (chính nó nếu tự blank). */
  blankedBy?: string
  tags: Tag[]
  power: number
}

export interface HandInput {
  /** Power của lá Loki rút từ REMIX. */
  lokiDraw?: number
}

export interface Ctx {
  self: LiveCard
  /** Mọi lá trong tay, kể cả lá bị blank. */
  all: LiveCard[]
  /** Các lá chưa bị blank (có thể gồm self). */
  active: LiveCard[]
  /** Giá trị lựa chọn của lá này trong phương án hiện tại. */
  choice: unknown
  input: HandInput
}

export interface Bonus {
  points: number
  reason: string
}

export interface Option {
  /** Rỗng = không cần hiển thị. */
  label: string
  value: unknown
}

export interface TagMod {
  stage: number
  apply: (ctx: Ctx) => void
}

export interface Rule {
  choices?: (hand: CardDef[], self: CardDef) => Option[]
  tagMods?: TagMod[]
  /** "Blanked unless…" / "Blanked if…". */
  selfBlank?: (ctx: Ctx) => boolean
  /** Trả về các lá bị lá này blank. */
  blank?: (ctx: Ctx) => LiveCard[]
  /** Điều kiện transform (bắt buộc khi thỏa). */
  transform?: (ctx: Ctx) => boolean
  /** Ghi đè base power (Rogue). */
  power?: (ctx: Ctx) => number | undefined
  bonus?: (ctx: Ctx) => Bonus[]
  /** Áp dụng kể cả khi lá bị blank (Loki). */
  always?: (input: HandInput) => Bonus[]
  input?: 'lokiDraw'
}
```

- [ ] **Step 3: Viết test tổ hợp (chưa có code) — `tests/engine/combinatorics.test.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test, thấy FAIL**

Run: `npx vitest run tests/engine/combinatorics.test.ts`
Expected: FAIL — không tìm thấy module `combinatorics`.

- [ ] **Step 5: Viết `src/engine/combinatorics.ts`**

```ts
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
```

- [ ] **Step 6: Chạy test + typecheck, thấy PASS**

Run: `npx vitest run tests/engine/combinatorics.test.ts && npx tsc`
Expected: 5 test PASS, `tsc` không lỗi.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src tests
git commit -m "chore: scaffold Vite React TS project with engine types"
```

---

### Task 2: Giải 1 phương án (resolve) và cộng điểm (score)

**Files:**
- Create: `src/engine/ctx.ts`, `src/engine/resolve.ts`, `src/engine/score.ts`
- Test: `tests/engine/resolve.test.ts`

**Interfaces:**
- Consumes: kiểu từ Task 1.
- Produces:
  - `makeCtx(self: LiveCard, all: LiveCard[], choices: Record<string, unknown>, input: HandInput): Ctx`
  - `interface Scenario { choices: Record<string, unknown>; order: string[] }`
  - `resolve(defs: CardDef[], scenario: Scenario, input?: HandInput): LiveCard[]`
  - `interface CardResult { id; name; type: CardType; tags: Tag[]; transformed; blanked; blankedBy?; power; powerStar: boolean; bonuses: Bonus[]; total }`
  - `interface HandResult { total; rawTotal; valid; cards: CardResult[]; extras: Bonus[]; choiceLabels: string[] }`
  - `scoreResolved(cards: LiveCard[], scenario: Scenario, input: HandInput): Omit<HandResult, 'choiceLabels'>`

- [ ] **Step 1: Viết test — `tests/engine/resolve.test.ts`**

```ts
import { resolve, type Scenario } from '../../src/engine/resolve'
import { scoreResolved } from '../../src/engine/score'
import { STAGE, type CardDef, type Ctx } from '../../src/engine/types'

const fake = (id: string, over: Partial<CardDef> = {}): CardDef => ({
  id, number: 0, deck: 'REMIX', type: 'HERO', name: id, power: 1, tags: [], text: '', rule: {}, ...over,
})
const run = (defs: CardDef[], scenario: Partial<Scenario> = {}, input = {}) => {
  const s = { choices: {}, order: [], ...scenario }
  const cards = resolve(defs, s, input)
  return { cards, result: scoreResolved(cards, s, input) }
}
const countTech = (ctx: Ctx) => ctx.active.reduce((n, c) => n + c.tags.filter(t => t === 'Tech').length, 0)

describe('resolve + score', () => {
  it('cộng power khi có HERO và VILLAIN', () => {
    const { result } = run([fake('h', { power: 3 }), fake('v', { type: 'VILLAIN', power: 5 })])
    expect(result).toMatchObject({ valid: true, total: 8, rawTotal: 8 })
  })

  it('thiếu VILLAIN thì tổng = 0 nhưng vẫn giữ rawTotal', () => {
    const { result } = run([fake('h', { power: 3 })])
    expect(result).toMatchObject({ valid: false, total: 0, rawTotal: 3 })
  })

  it('lá tự blank không có điểm và tag của nó không được đếm', () => {
    const defs = [
      fake('a', { tags: ['Tech'], power: 4, rule: { selfBlank: () => true } }),
      fake('b', { rule: { bonus: ctx => [{ points: countTech(ctx), reason: 'tech' }] } }),
      fake('v', { type: 'VILLAIN', power: 0 }),
    ]
    const { cards, result } = run(defs, { order: ['a'] })
    expect(cards[0]).toMatchObject({ blanked: true, blankedBy: 'a' })
    expect(result.cards[0].total).toBe(0)
    expect(result.cards[1].total).toBe(1)
  })

  it('thứ tự blank: lá đã bị blank không blank được lá khác', () => {
    const defs = [
      fake('a', { rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'b') } }),
      fake('b', { rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'a') } }),
    ]
    const ab = run(defs, { order: ['a', 'b'] }).cards
    expect(ab.map(c => c.blanked)).toEqual([false, true])
    const ba = run(defs, { order: ['b', 'a'] }).cards
    expect(ba.map(c => c.blanked)).toEqual([true, false])
  })

  it('transform đổi mặt, power và tag', () => {
    const defs = [
      fake('t', {
        power: 1, tags: ['Gamma'],
        transform: { name: 'Big', type: 'HERO', power: 13, tags: ['Strength'], text: '' },
        rule: { transform: ctx => ctx.active.some(c => c !== ctx.self && c.tags.includes('Gamma')) },
      }),
      fake('g', { tags: ['Gamma'] }),
    ]
    const { cards } = run(defs)
    expect(cards[0]).toMatchObject({ transformed: true, power: 13, tags: ['Strength'] })
    expect(cards[0].face.name).toBe('Big')
  })

  it('tagMods chạy theo stage: ADD trước REMOVE', () => {
    const defs = [
      fake('remover', { rule: { tagMods: [{ stage: STAGE.REMOVE, apply: ctx => ctx.active.forEach(c => { c.tags = c.tags.filter(t => t !== 'Tech') }) }] } }),
      fake('adder', { rule: { tagMods: [{ stage: STAGE.ADD, apply: ctx => { ctx.self.tags.push('Tech') } }] } }),
    ]
    const { cards } = run(defs)
    expect(cards[1].tags).toEqual([])
  })

  it('always áp dụng kể cả khi lá bị blank', () => {
    const defs = [
      fake('l', { type: 'VILLAIN', power: 15, rule: { selfBlank: () => true, always: i => [{ points: -(i.lokiDraw ?? 0), reason: 'loki' }] } }),
      fake('v', { type: 'VILLAIN', power: 5 }),
      fake('h', { power: 2 }),
    ]
    const { result } = run(defs, { order: ['l'] }, { lokiDraw: 4 })
    expect(result.extras).toEqual([{ points: -4, reason: 'loki' }])
    expect(result.total).toBe(3)
  })

  it('power override (Rogue) áp dụng sau tag', () => {
    const defs = [fake('r', { power: 0, powerStar: true, rule: { power: () => 7 } }), fake('v', { type: 'VILLAIN', power: 0 })]
    const { result } = run(defs)
    expect(result.cards[0]).toMatchObject({ power: 7, powerStar: false, total: 7 })
  })
})
```

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `npx vitest run tests/engine/resolve.test.ts`
Expected: FAIL — không tìm thấy module `resolve`.

- [ ] **Step 3: Viết `src/engine/ctx.ts`**

```ts
import type { Ctx, HandInput, LiveCard } from './types'

export function makeCtx(self: LiveCard, all: LiveCard[], choices: Record<string, unknown>, input: HandInput): Ctx {
  return { self, all, active: all.filter(c => !c.blanked), choice: choices[self.def.id], input }
}
```

- [ ] **Step 4: Viết `src/engine/resolve.ts`**

```ts
import { makeCtx } from './ctx'
import type { CardDef, HandInput, LiveCard } from './types'

export interface Scenario {
  /** Lựa chọn của từng lá, theo id lá. */
  choices: Record<string, unknown>
  /** Thứ tự kích hoạt các lá có hiệu ứng blank/selfBlank. */
  order: string[]
}

const MAX_TRANSFORM_PASSES = 5

function fresh(defs: CardDef[], transformed: Set<string>): LiveCard[] {
  return defs.map(def => {
    const isT = transformed.has(def.id) && def.transform !== undefined
    const face = isT ? def.transform! : def
    return { def, face, transformed: isT, blanked: false, tags: [...face.tags], power: face.power }
  })
}

/** Tính lại tag và power của mọi lá từ mặt hiện tại + tagMods của các lá đang hoạt động. */
export function computeTags(cards: LiveCard[], scenario: Scenario, input: HandInput): void {
  for (const c of cards) {
    c.tags = [...c.face.tags]
    c.power = c.face.power
  }
  const mods = cards
    .filter(c => !c.blanked)
    .flatMap(c => (c.def.rule.tagMods ?? []).map(mod => ({ c, mod })))
    .sort((a, b) => a.mod.stage - b.mod.stage)
  for (const { c, mod } of mods) mod.apply(makeCtx(c, cards, scenario.choices, input))
  for (const c of cards) {
    if (c.blanked || !c.def.rule.power) continue
    const p = c.def.rule.power(makeCtx(c, cards, scenario.choices, input))
    if (p !== undefined) c.power = p
  }
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x))

export function resolve(defs: CardDef[], scenario: Scenario, input: HandInput = {}): LiveCard[] {
  let transformed = new Set<string>()
  let cards: LiveCard[] = []
  for (let pass = 0; pass < MAX_TRANSFORM_PASSES; pass++) {
    cards = fresh(defs, transformed)
    computeTags(cards, scenario, input)
    for (const id of scenario.order) {
      const c = cards.find(x => x.def.id === id)
      if (!c || c.blanked) continue
      const ctx = makeCtx(c, cards, scenario.choices, input)
      if (c.def.rule.selfBlank?.(ctx)) {
        c.blanked = true
        c.blankedBy = c.def.id
      } else if (c.def.rule.blank) {
        for (const t of c.def.rule.blank(ctx)) {
          if (t.blanked) continue
          t.blanked = true
          t.blankedBy = c.def.id
        }
      }
      computeTags(cards, scenario, input)
    }
    const next = new Set(
      cards
        .filter(c => !c.blanked && c.def.transform && c.def.rule.transform?.(makeCtx(c, cards, scenario.choices, input)))
        .map(c => c.def.id),
    )
    if (sameSet(next, transformed)) break
    transformed = next
  }
  return cards
}
```

- [ ] **Step 5: Viết `src/engine/score.ts`**

```ts
import { makeCtx } from './ctx'
import type { Scenario } from './resolve'
import type { Bonus, CardType, HandInput, LiveCard, Tag } from './types'

export interface CardResult {
  id: string
  name: string
  type: CardType
  tags: Tag[]
  transformed: boolean
  blanked: boolean
  blankedBy?: string
  power: number
  powerStar: boolean
  bonuses: Bonus[]
  total: number
}

export interface HandResult {
  total: number
  /** Tổng nếu bỏ qua điều kiện HERO/ALLY + VILLAIN. */
  rawTotal: number
  valid: boolean
  cards: CardResult[]
  /** Điểm không gắn với lá đang hoạt động (Loki). */
  extras: Bonus[]
  choiceLabels: string[]
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function scoreResolved(cards: LiveCard[], scenario: Scenario, input: HandInput): Omit<HandResult, 'choiceLabels'> {
  const active = cards.filter(c => !c.blanked)
  const valid =
    active.some(c => c.face.type === 'HERO' || c.face.type === 'ALLY') && active.some(c => c.face.type === 'VILLAIN')
  const results: CardResult[] = cards.map(c => {
    const base = {
      id: c.def.id,
      name: c.face.name,
      type: c.face.type,
      tags: c.tags,
      transformed: c.transformed,
      blanked: c.blanked,
      blankedBy: c.blankedBy,
      powerStar: !!c.face.powerStar && c.power === c.face.power,
    }
    if (c.blanked) return { ...base, power: 0, bonuses: [], total: 0 }
    const bonuses = c.def.rule.bonus?.(makeCtx(c, cards, scenario.choices, input)) ?? []
    return { ...base, power: c.power, bonuses, total: c.power + sum(bonuses.map(b => b.points)) }
  })
  const extras = cards.flatMap(c => c.def.rule.always?.(input) ?? [])
  const rawTotal = sum(results.map(r => r.total)) + sum(extras.map(b => b.points))
  return { valid, rawTotal, total: valid ? rawTotal : 0, cards: results, extras }
}
```

- [ ] **Step 6: Chạy test + typecheck, thấy PASS**

Run: `npx vitest run tests/engine && npx tsc`
Expected: mọi test PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine tests/engine
git commit -m "feat(engine): resolve one scenario and score it"
```

---

### Task 3: Tối ưu phương án (scoreHand) + hàm trợ giúp viết luật

**Files:**
- Create: `src/engine/optimize.ts`, `src/engine/helpers.ts`
- Test: `tests/engine/optimize.test.ts`, `tests/engine/helpers.test.ts`

**Interfaces:**
- Consumes: `resolve`, `scoreResolved`, `HandResult`, `product`, `permutations`.
- Produces:
  - `MAX_SCENARIOS = 20000`; `scoreHand(defs: CardDef[], input?: HandInput): HandResult`
  - helpers: `NONE`, `isType`, `others`, `tagCount`, `countTags(ctx, tags, excludeSelf?)`, `countType(ctx, types, excludeSelf?)`, `hasName(ctx, ...names)`, `hasTypeWithTag(ctx, types, tag?)`, `withUrbanLocation(ctx)`, `makeBonus(points, reason)`, `combine(...fns)`, `forEachTag(pts, tags, excludeSelf?)`, `forEachType(pts, types, excludeSelf?)`, `forEachPair(pts, a, b)`, `when(pts, reason, pred)`, `unless(pts, reason, pred)`, `blankedUnless(pred)`, `pickTarget(ctx, candidates)`, `targetOptions(hand, self, types, verb)`, `faceTags(def)`, `hasTagAnyFace(def, tag)`, `findActive(ctx, id)`, `interface TagPick { id; name; tag }`, `mutantHeroes(hand)`, `applyDouble(ctx, picks)`.

- [ ] **Step 1: Viết test optimizer — `tests/engine/optimize.test.ts`**

```ts
import { MAX_SCENARIOS, scoreHand } from '../../src/engine/optimize'
import type { CardDef } from '../../src/engine/types'

const fake = (id: string, over: Partial<CardDef> = {}): CardDef => ({
  id, number: 0, deck: 'REMIX', type: 'HERO', name: id, power: 0, tags: [], text: '', rule: {}, ...over,
})
const villain = fake('v', { type: 'VILLAIN' })

describe('scoreHand', () => {
  it('tay rỗng: 0 điểm, không hợp lệ, không lỗi', () => {
    expect(scoreHand([])).toMatchObject({ total: 0, rawTotal: 0, valid: false, cards: [] })
  })

  it('chọn lựa chọn cho điểm cao nhất và ghi nhãn', () => {
    const chooser = fake('c', {
      rule: {
        choices: () => [{ label: 'thấp', value: 1 }, { label: 'cao', value: 5 }],
        bonus: ctx => [{ points: ctx.choice as number, reason: 'chọn' }],
      },
    })
    const r = scoreHand([chooser, villain])
    expect(r.total).toBe(5)
    expect(r.choiceLabels).toEqual(['cao'])
  })

  it('chọn thứ tự blank tốt nhất', () => {
    const a = fake('a', { power: 10, rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'b') } })
    const b = fake('b', { power: 1, rule: { blank: ctx => ctx.active.filter(c => c.def.id === 'a') } })
    expect(scoreHand([a, b, villain]).total).toBe(10)
  })

  it('dừng ở MAX_SCENARIOS khi quá nhiều lựa chọn', () => {
    const many = fake('m', {
      rule: {
        choices: () => Array.from({ length: MAX_SCENARIOS + 10000 }, (_, i) => ({ label: `${i}`, value: i })),
        bonus: ctx => [{ points: ctx.choice as number, reason: 'n' }],
      },
    })
    const r = scoreHand([many, villain])
    expect(r.total).toBe(MAX_SCENARIOS - 1)
  })

  it('lá có choices nhưng không có lựa chọn nào vẫn tính được', () => {
    const empty = fake('e', { power: 2, rule: { choices: () => [] } })
    expect(scoreHand([empty, villain]).total).toBe(2)
  })
})
```

- [ ] **Step 2: Viết test helpers — `tests/engine/helpers.test.ts`**

```ts
import { makeCtx } from '../../src/engine/ctx'
import { countTags, forEachPair, forEachTag, forEachType, pickTarget, targetOptions } from '../../src/engine/helpers'
import type { CardDef, LiveCard, Tag } from '../../src/engine/types'

const def = (id: string, type: CardDef['type'], tags: Tag[]): CardDef => ({
  id, number: 0, deck: 'REMIX', type, name: id, power: 0, tags, text: '', rule: {},
})
const live = (d: CardDef, blanked = false): LiveCard => ({ def: d, face: d, transformed: false, blanked, tags: [...d.tags], power: 0 })

const a = live(def('a', 'HERO', ['Tech', 'Tech']))
const b = live(def('b', 'ALLY', ['Tech', 'Intel']))
const c = live(def('c', 'LOCATION', ['Tech']), true)
const all = [a, b, c]
const ctxA = (choice?: unknown) => ({ ...makeCtx(a, all, {}, {}), choice })

describe('helpers', () => {
  it('countTags bỏ qua lá bị blank và có thể loại self', () => {
    expect(countTags(ctxA(), 'Tech')).toBe(3)
    expect(countTags(ctxA(), 'Tech', true)).toBe(1)
  })
  it('forEachTag / forEachType tạo bonus có lý do', () => {
    expect(forEachTag(2, ['Tech', 'Intel'])(ctxA())).toEqual([{ points: 8, reason: '+2 × 4 (Tech, Intel)' }])
    expect(forEachType(-3, 'HERO')(ctxA())).toEqual([{ points: -3, reason: '-3 × 1 HERO' }])
    expect(forEachTag(5, 'Boss')(ctxA())).toEqual([])
  })
  it('forEachPair lấy min của hai tag', () => {
    expect(forEachPair(13, 'Tech', 'Intel')(ctxA())).toEqual([{ points: 13, reason: '+13 × 1 cặp Tech+Intel' }])
  })
  it('pickTarget ưu tiên lựa chọn, nếu không có thì lấy lá đầu', () => {
    expect(pickTarget(ctxA('b'), [a, b])).toEqual([b])
    expect(pickTarget(ctxA('x'), [a, b])).toEqual([a])
    expect(pickTarget(ctxA('b'), [])).toEqual([])
  })
  it('targetOptions liệt kê lá khác đúng loại', () => {
    const hand = [a.def, b.def, c.def]
    expect(targetOptions(hand, a.def, ['HERO', 'ALLY'], 'blank')).toEqual([{ label: 'a: blank b', value: 'b' }])
  })
})
```

- [ ] **Step 3: Chạy test, thấy FAIL**

Run: `npx vitest run tests/engine/optimize.test.ts tests/engine/helpers.test.ts`
Expected: FAIL — không tìm thấy `optimize`, `helpers`.

- [ ] **Step 4: Viết `src/engine/optimize.ts`**

```ts
import { permutations, product } from './combinatorics'
import { resolve } from './resolve'
import { scoreResolved, type HandResult } from './score'
import type { CardDef, HandInput, Option } from './types'

/** Giới hạn số phương án để giao diện không bị treo với tay bài cực nhiều lựa chọn. */
export const MAX_SCENARIOS = 20000

const NO_CHOICE: Option = { label: '', value: undefined }

export function scoreHand(defs: CardDef[], input: HandInput = {}): HandResult {
  const choiceCards = defs.filter(d => d.rule.choices)
  const lists = choiceCards.map(d => {
    const opts = d.rule.choices!(defs, d)
    return opts.length > 0 ? opts : [NO_CHOICE]
  })
  const blankers = defs.filter(d => d.rule.blank || d.rule.selfBlank).map(d => d.id)
  const orders = [...permutations(blankers)]

  let best: HandResult | undefined
  let n = 0
  outer: for (const combo of product(lists)) {
    const choices = Object.fromEntries(choiceCards.map((d, i) => [d.id, combo[i].value]))
    for (const order of orders) {
      if (n++ >= MAX_SCENARIOS) break outer
      const scenario = { choices, order }
      const r = scoreResolved(resolve(defs, scenario, input), scenario, input)
      if (!best || r.total > best.total || (r.total === best.total && r.rawTotal > best.rawTotal)) {
        best = { ...r, choiceLabels: combo.map(o => o.label).filter(Boolean) }
      }
    }
  }
  return best!
}
```

- [ ] **Step 5: Viết `src/engine/helpers.ts`**

```ts
import type { Bonus, CardDef, CardType, Ctx, LiveCard, Option, Tag } from './types'

type Types = CardType | CardType[]
type BonusFn = (ctx: Ctx) => Bonus[]
type Pred = (ctx: Ctx) => boolean

const asList = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x])
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export const NONE: Option = { label: '', value: undefined }

// ---- truy vấn tay bài ----
export const isType = (c: LiveCard, types: Types) => asList(types).includes(c.face.type)
export const others = (ctx: Ctx) => ctx.active.filter(c => c !== ctx.self)
const pool = (ctx: Ctx, excludeSelf: boolean) => (excludeSelf ? others(ctx) : ctx.active)

export const tagCount = (cards: LiveCard[], tag: Tag) =>
  cards.reduce((n, c) => n + c.tags.filter(t => t === tag).length, 0)
export const countTags = (ctx: Ctx, tags: Tag | Tag[], excludeSelf = false) =>
  asList(tags).reduce((n, t) => n + tagCount(pool(ctx, excludeSelf), t), 0)
export const countType = (ctx: Ctx, types: Types, excludeSelf = false) =>
  pool(ctx, excludeSelf).filter(c => isType(c, types)).length
export const hasName = (ctx: Ctx, ...names: string[]) => others(ctx).some(c => names.includes(c.face.name))
export const hasTypeWithTag = (ctx: Ctx, types: Types, tag?: Tag) =>
  others(ctx).some(c => isType(c, types) && (!tag || c.tags.includes(tag)))
export const withUrbanLocation: Pred = ctx => hasTypeWithTag(ctx, 'LOCATION', 'Urban')
export const findActive = (ctx: Ctx, id: unknown) => ctx.active.find(c => c.def.id === id)

// ---- bonus ----
export const makeBonus = (points: number, reason: string): Bonus[] => (points === 0 ? [] : [{ points, reason }])
export const combine = (...fns: BonusFn[]): BonusFn => ctx => fns.flatMap(f => f(ctx))

export const forEachTag = (pts: number, tags: Tag | Tag[], excludeSelf = false): BonusFn => ctx => {
  const n = countTags(ctx, tags, excludeSelf)
  return makeBonus(pts * n, `${signed(pts)} × ${n} (${asList(tags).join(', ')})`)
}
export const forEachType = (pts: number, types: Types, excludeSelf = false): BonusFn => ctx => {
  const n = countType(ctx, types, excludeSelf)
  return makeBonus(pts * n, `${signed(pts)} × ${n} ${asList(types).join('/')}`)
}
export const forEachPair = (pts: number, a: Tag, b: Tag): BonusFn => ctx => {
  const n = Math.min(countTags(ctx, a), countTags(ctx, b))
  return makeBonus(pts * n, `${signed(pts)} × ${n} cặp ${a}+${b}`)
}
export const when = (pts: number, reason: string, pred: Pred): BonusFn => ctx =>
  pred(ctx) ? makeBonus(pts, `${signed(pts)} ${reason}`) : []
export const unless = (pts: number, reason: string, pred: Pred): BonusFn => ctx =>
  pred(ctx) ? [] : makeBonus(pts, `${signed(pts)} ${reason}`)

// ---- blank ----
export const blankedUnless = (pred: Pred): Pred => ctx => !pred(ctx)

/** Lá được chọn nếu còn trong danh sách, không thì lá đầu tiên (hiệu ứng blank là bắt buộc). */
export function pickTarget(ctx: Ctx, candidates: LiveCard[]): LiveCard[] {
  if (candidates.length === 0) return []
  return [candidates.find(c => c.def.id === ctx.choice) ?? candidates[0]]
}

// ---- lựa chọn ----
export const targetOptions = (hand: CardDef[], self: CardDef, types: Types, verb: string): Option[] =>
  hand
    .filter(d => d !== self && asList(types).includes(d.type))
    .map(d => ({ label: `${self.name}: ${verb} ${d.name}`, value: d.id }))

export const faceTags = (d: CardDef): Tag[] => [...new Set([...d.tags, ...(d.transform?.tags ?? [])])]
export const hasTagAnyFace = (d: CardDef, tag: Tag) => faceTags(d).includes(tag)

export interface TagPick {
  id: string
  name: string
  tag: Tag
}
export const mutantHeroes = (hand: CardDef[]) => hand.filter(d => d.type === 'HERO' && hasTagAnyFace(d, 'Mutant'))

/** "Count one tag twice": nhân đôi tag của HERO đang có Mutant. */
export function applyDouble(ctx: Ctx, picks: TagPick[]) {
  for (const p of picks) {
    const c = findActive(ctx, p.id)
    if (c && isType(c, 'HERO') && c.tags.includes('Mutant') && c.tags.includes(p.tag)) c.tags.push(p.tag)
  }
}
```

- [ ] **Step 6: Chạy test + typecheck, thấy PASS**

Run: `npx vitest run tests/engine && npx tsc`
Expected: mọi test PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine tests/engine
git commit -m "feat(engine): optimize choices/blank order and add rule helpers"
```

---

### Task 4: Dữ liệu HERO + ALLY (30 lá)

**Files:**
- Create: `src/data/define.ts`, `src/data/heroes.ts`, `src/data/index.ts`, `tests/play.ts`
- Test: `tests/data/heroes.test.ts`

**Interfaces:**
- Consumes: helpers (Task 3), `scoreHand`, `STAGE`, `pairs`, `product`.
- Produces:
  - `define.ts`: `hero`, `ally`, `condition`, `equipment`, `location`, `maneuver`, `villain` — mỗi hàm `(c: CardInput) => CardDef` với `CardInput = Omit<CardDef, 'deck' | 'type' | 'text' | 'rule'> & { text?: string; rule?: Rule }`.
  - `heroes.ts`: `HEROES: CardDef[]`, `ALLIES: CardDef[]`.
  - `index.ts`: `CARDS: CardDef[]`, `CARD_BY_ID: Map<string, CardDef>`, `getCard(id: string): CardDef` (ném lỗi nếu không có).
  - `tests/play.ts`: `play(ids: string[], input?: HandInput): HandResult`, `cardOf(r: HandResult, id: string): CardResult`.

- [ ] **Step 1: Viết `src/data/define.ts`**

```ts
import type { CardDef, CardType, Rule } from '../engine/types'

export type CardInput = Omit<CardDef, 'deck' | 'type' | 'text' | 'rule'> & { text?: string; rule?: Rule }

const define = (deck: CardDef['deck'], type: CardType) => (c: CardInput): CardDef => ({
  text: '',
  rule: {},
  ...c,
  deck,
  type,
})

export const hero = define('REMIX', 'HERO')
export const ally = define('REMIX', 'ALLY')
export const condition = define('REMIX', 'CONDITION')
export const equipment = define('REMIX', 'EQUIPMENT')
export const location = define('REMIX', 'LOCATION')
export const maneuver = define('REMIX', 'MANEUVER')
export const villain = define('VILLAIN', 'VILLAIN')
```

- [ ] **Step 2: Viết `tests/play.ts` và `src/data/index.ts` (tạm chỉ có HEROES/ALLIES)**

`tests/play.ts`:
```ts
import { getCard } from '../src/data'
import { scoreHand } from '../src/engine/optimize'
import type { CardResult, HandResult } from '../src/engine/score'
import type { HandInput } from '../src/engine/types'

export const play = (ids: string[], input: HandInput = {}): HandResult => scoreHand(ids.map(getCard), input)

export function cardOf(r: HandResult, id: string): CardResult {
  const c = r.cards.find(x => x.id === id)
  if (!c) throw new Error(`card ${id} not in result`)
  return c
}
```

`src/data/index.ts`:
```ts
import type { CardDef } from '../engine/types'
import { ALLIES, HEROES } from './heroes'

export const CARDS: CardDef[] = [...HEROES, ...ALLIES]
export const CARD_BY_ID = new Map(CARDS.map(c => [c.id, c]))

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID.get(id)
  if (!c) throw new Error(`Unknown card: ${id}`)
  return c
}
```

- [ ] **Step 3: Viết test HERO/ALLY — `tests/data/heroes.test.ts`**

Mỗi dòng: tay bài → lá cần kiểm → tổng điểm của lá đó (base + bonus, 0 nếu bị blank).

```ts
import { HEROES, ALLIES } from '../../src/data/heroes'
import { cardOf, play } from '../play'

describe('HERO/ALLY', () => {
  it('đủ 23 HERO và 7 ALLY', () => {
    expect(HEROES).toHaveLength(23)
    expect(ALLIES).toHaveLength(7)
  })

  it.each([
    ['black-panther', ['black-panther', 'dora-milaje', 'birnin-zana'], 14],
    ['bruce-banner', ['bruce-banner'], 1],
    ['bruce-banner', ['bruce-banner', 'she-hulk'], 13],
    ['captain-america', ['captain-america', 'black-widow', 'vibranium-shield'], 10],
    ['cyclops', ['cyclops', 'storm', 'beast'], 10],
    ['jean-grey', ['jean-grey', 'storm', 'beast'], 6],
    ['professor-x', ['professor-x', 'cerebro', 'xavier-mansion'], 15],
    ['rogue', ['rogue', 'hawkeye', 'ultron'], 5],
    ['shadowcat', ['shadowcat', 'factory', 'hidden-lair'], 8],
    ['she-hulk', ['she-hulk', 'hulk-operations', 'abomination'], 14],
    ['falling-debris', ['shuri', 'black-widow', 'falling-debris'], 8],
    ['spider-man', ['spider-man', 'skyscraper'], 10],
    ['skyscraper', ['spider-man', 'skyscraper'], 8],
    ['thor-odinson', ['thor-odinson', 'mjolnir'], 12],
    ['thor-odinson', ['thor-odinson', 'forge', 'heimdall'], 12],
    ['tony-stark', ['tony-stark', 'moira-mactaggert', 'cerebro'], 8],
    ['falling-debris', ['vision', 'falling-debris'], 8],
    ['wolverine', ['wolverine', 'magneto'], 10],
    ['forge', ['forge', 'cerebro', 'x-jet'], 12],
    ['heimdall', ['heimdall', 'bifrost'], 10],
    ['jane-foster', ['jane-foster', 'thor-odinson'], 13],
    ['jane-foster', ['jane-foster', 'thor-odinson', 'mjolnir'], 13],
    ['lockheed', ['lockheed', 'shadowcat'], 12],
    ['sauron', ['moira-mactaggert', 'storm', 'sauron'], 14],
  ])('%s trong %j = %i', (id, hand, expected) => {
    expect(cardOf(play(hand), id).total).toBe(expected)
  })

  it('Bruce Banner transform thành Hulk khi có Gamma khác', () => {
    expect(cardOf(play(['bruce-banner', 'she-hulk']), 'bruce-banner')).toMatchObject({ transformed: true, name: 'Hulk' })
  })

  it('Rogue chép power + Tech của Hawkeye để Ultron không bị -20', () => {
    const r = play(['rogue', 'hawkeye', 'ultron'])
    expect(r.total).toBe(24)
    expect(r.choiceLabels).toEqual(['Rogue: chép Hawkeye + Tech'])
  })

  it('Tony Stark transform thành Iron Man với 2 Intel', () => {
    const r = play(['tony-stark', 'moira-mactaggert', 'cerebro', 'taskmaster'])
    expect(cardOf(r, 'tony-stark')).toMatchObject({ transformed: true, name: 'Iron Man' })
    expect(r.total).toBe(30)
  })

  it('Vision chọn Strength + Flight cho Falling Debris', () => {
    expect(play(['vision', 'falling-debris']).choiceLabels).toEqual(['Vision: Strength + Flight'])
  })
})
```

> Test này tham chiếu cả lá ở Task 5/6 (birnin-zana, ultron, …). Ở Task 4 chỉ chạy được sau khi Task 5, 6 xong; vì vậy Step 4 chạy riêng phần độ dài, phần `it.each` được xác nhận ở Task 6 Step 7.

- [ ] **Step 4: Chạy test độ dài, thấy FAIL**

Run: `npx vitest run tests/data/heroes.test.ts -t "đủ 23 HERO"`
Expected: FAIL — không tìm thấy `heroes`.

- [ ] **Step 5: Viết `src/data/heroes.ts`**

```ts
import { pairs } from '../engine/combinatorics'
import {
  NONE, applyDouble, combine, countTags, countType, faceTags, findActive, forEachTag, forEachType,
  hasName, hasTypeWithTag, makeBonus, mutantHeroes, when, withUrbanLocation, type TagPick,
} from '../engine/helpers'
import { STAGE, type Option, type Tag } from '../engine/types'
import { ally, hero } from './define'

const VISION_TAGS: Tag[] = ['Strength', 'Flight', 'Tech', 'Range']
const SHURI_TAGS: Tag[] = ['Strength', 'Range', 'Agility']

interface RogueChoice { id: string; tag?: Tag }
interface ShuriChoice { self?: Tag; other?: TagPick }

export const HEROES = [
  hero({ number: 1, id: 'angel', name: 'Angel', power: 6, tags: ['Mutant', 'Flight', 'Agility'] }),
  hero({ number: 2, id: 'beast', name: 'Beast', power: 6, tags: ['Mutant', 'Agility', 'Tech'] }),
  hero({
    number: 3, id: 'black-panther', name: 'Black Panther', power: 4, tags: ['Wakanda', 'Agility'],
    text: '+5 for each other Wakanda.',
    rule: { bonus: forEachTag(5, 'Wakanda', true) },
  }),
  hero({ number: 4, id: 'black-widow', name: 'Black Widow', power: 6, tags: ['Agility', 'Agility', 'Intel'] }),
  hero({
    number: 5, id: 'bruce-banner', name: 'Bruce Banner', power: 1, tags: ['Gamma', 'Tech'],
    text: 'Transform with any other Gamma.',
    transform: { name: 'Hulk', type: 'HERO', power: 13, tags: ['Strength', 'Strength', 'Strength', 'Gamma'], text: '' },
    rule: { transform: ctx => countTags(ctx, 'Gamma', true) >= 1 },
  }),
  hero({
    number: 6, id: 'captain-america', name: 'Captain America', power: 4, tags: ['Worthy', 'Agility'],
    text: '+2 for each other HERO. +4 with VIBRANIUM SHIELD.',
    rule: {
      bonus: combine(forEachType(2, 'HERO', true), when(4, 'có Vibranium Shield', ctx => hasName(ctx, 'Vibranium Shield'))),
    },
  }),
  hero({ number: 7, id: 'colossus', name: 'Colossus', power: 6, tags: ['Mutant', 'Strength', 'Strength'] }),
  hero({
    number: 8, id: 'cyclops', name: 'Cyclops', power: 4, tags: ['Mutant', 'Range'],
    text: '+3 for each other Mutant.',
    rule: { bonus: forEachTag(3, 'Mutant', true) },
  }),
  hero({ number: 9, id: 'falcon', name: 'Falcon', power: 6, tags: ['Range', 'Flight', 'Tech'] }),
  hero({ number: 10, id: 'hawkeye', name: 'Hawkeye', power: 5, tags: ['Range', 'Range', 'Tech'] }),
  hero({
    number: 11, id: 'jean-grey', name: 'Jean Grey', power: 3, tags: ['Mutant', 'Range', 'Intel'],
    text: 'Transform with two or more other Mutant.',
    transform: { name: 'Phoenix', type: 'HERO', power: 6, tags: ['Intel', 'Range', 'Range', 'Flight', 'Mutant'], text: '' },
    rule: { transform: ctx => countTags(ctx, 'Mutant', true) >= 2 },
  }),
  hero({
    number: 12, id: 'professor-x', name: 'Professor X', power: 3, tags: ['Mutant', 'Intel'],
    text: '+6 for each of CEREBRO and XAVIER MANSION.',
    rule: {
      bonus: ctx => {
        const n = ['Cerebro', 'Xavier Mansion'].filter(name => hasName(ctx, name)).length
        return makeBonus(6 * n, `+6 × ${n} (Cerebro/Xavier Mansion)`)
      },
    },
  }),
  hero({
    number: 13, id: 'rogue', name: 'Rogue', power: 0, powerStar: true, tags: ['Mutant'],
    text: 'ROGUE may copy the base power and one tag of another HERO in your hand.',
    rule: {
      choices: (hand, self) => [
        NONE,
        ...hand
          .filter(d => d !== self && d.type === 'HERO')
          .flatMap(d =>
            [undefined, ...faceTags(d)].map(tag => ({
              label: `Rogue: chép ${d.name}${tag ? ` + ${tag}` : ''}`,
              value: { id: d.id, tag } satisfies RogueChoice,
            })),
          ),
      ],
      tagMods: [{
        stage: STAGE.ADD,
        apply: ctx => {
          const v = ctx.choice as RogueChoice | undefined
          const target = v && findActive(ctx, v.id)
          if (target && v.tag && target.face.tags.includes(v.tag)) ctx.self.tags.push(v.tag)
        },
      }],
      power: ctx => {
        const v = ctx.choice as RogueChoice | undefined
        return (v && findActive(ctx, v.id))?.face.power
      },
    },
  }),
  hero({
    number: 14, id: 'shadowcat', name: 'Shadowcat', power: 4, tags: ['Mutant', 'Tech'],
    text: '+4 with any LOCATION.',
    rule: { bonus: when(4, 'có LOCATION', ctx => countType(ctx, 'LOCATION', true) >= 1) },
  }),
  hero({
    number: 15, id: 'she-hulk', name: 'She-Hulk', power: 4, tags: ['Gamma', 'Strength'],
    text: '+5 for each other Gamma.',
    rule: { bonus: forEachTag(5, 'Gamma', true) },
  }),
  hero({
    number: 16, id: 'shuri', name: 'Shuri', power: 2, tags: ['Wakanda', 'Tech'],
    text: 'SHURI and one other HERO or ALLY may each add one of Strength, Range, or Agility.',
    rule: {
      choices: (hand, self) => {
        const targets = hand.filter(d => d !== self && (d.type === 'HERO' || d.type === 'ALLY'))
        const selfOpts: (Tag | undefined)[] = [undefined, ...SHURI_TAGS]
        const otherOpts: (TagPick | undefined)[] = [
          undefined,
          ...targets.flatMap(d => SHURI_TAGS.map(tag => ({ id: d.id, name: d.name, tag }))),
        ]
        return selfOpts.flatMap(s =>
          otherOpts.map((o): Option => ({
            label: [s && `Shuri +${s}`, o && `${o.name} +${o.tag}`].filter(Boolean).join(', '),
            value: { self: s, other: o } satisfies ShuriChoice,
          })),
        )
      },
      tagMods: [{
        stage: STAGE.ADD,
        apply: ctx => {
          const v = ctx.choice as ShuriChoice | undefined
          if (v?.self) ctx.self.tags.push(v.self)
          if (v?.other) findActive(ctx, v.other.id)?.tags.push(v.other.tag)
        },
      }],
    },
  }),
  hero({
    number: 17, id: 'spider-man', name: 'Spider-Man', power: 5, tags: ['Agility', 'Strength'],
    text: '+5 and Flight with a LOCATION with Urban.',
    rule: {
      tagMods: [{ stage: STAGE.ADD, apply: ctx => { if (withUrbanLocation(ctx)) ctx.self.tags.push('Flight') } }],
      bonus: when(5, 'có LOCATION Urban', withUrbanLocation),
    },
  }),
  hero({ number: 18, id: 'storm', name: 'Storm', power: 4, tags: ['Mutant', 'Range', 'Flight'] }),
  hero({
    number: 19, id: 'thor-odinson', name: 'Thor Odinson', power: 4, tags: ['Strength', 'Asgard', 'Worthy'],
    text: 'Transform with MJOLNIR or two or more ALLIES.',
    transform: {
      name: 'God of Thunder', type: 'HERO', power: 12, tags: ['Strength', 'Flight', 'Range', 'Asgard', 'Worthy'], text: '',
    },
    rule: { transform: ctx => hasName(ctx, 'Mjolnir') || countType(ctx, 'ALLY') >= 2 },
  }),
  hero({
    number: 20, id: 'tony-stark', name: 'Tony Stark', power: 3, tags: ['Range', 'Tech'],
    text: 'Transform with two or more Intel.',
    transform: { name: 'Iron Man', type: 'HERO', power: 8, tags: ['Tech', 'Strength', 'Flight', 'Range'], text: '' },
    rule: { transform: ctx => countTags(ctx, 'Intel') >= 2 },
  }),
  hero({ number: 21, id: 'valkyrie', name: 'Valkyrie', power: 7, tags: ['Strength', 'Flight', 'Asgard'] }),
  hero({
    number: 22, id: 'vision', name: 'Vision', power: 3, tags: ['Worthy'],
    text: 'VISION has your choice of two different tags, either Strength, Flight, Tech, or Range.',
    rule: {
      choices: () => pairs(VISION_TAGS).map(([a, b]) => ({ label: `Vision: ${a} + ${b}`, value: [a, b] })),
      tagMods: [{ stage: STAGE.ADD, apply: ctx => { ctx.self.tags.push(...((ctx.choice as Tag[] | undefined) ?? [])) } }],
    },
  }),
  hero({
    number: 23, id: 'wolverine', name: 'Wolverine', power: 4, tags: ['Mutant', 'Agility'],
    text: '+6 with any VILLAIN with Boss.',
    rule: { bonus: when(6, 'có VILLAIN Boss', ctx => hasTypeWithTag(ctx, 'VILLAIN', 'Boss')) },
  }),
]

export const ALLIES = [
  ally({ number: 24, id: 'dora-milaje', name: 'Dora Milaje', power: 6, tags: ['Wakanda', 'Agility', 'Intel'] }),
  ally({
    number: 25, id: 'forge', name: 'Forge', power: 4, tags: ['Mutant', 'Tech'],
    text: '+4 for each EQUIPMENT.',
    rule: { bonus: forEachType(4, 'EQUIPMENT') },
  }),
  ally({
    number: 26, id: 'heimdall', name: 'Heimdall', power: 4, tags: ['Asgard', 'Intel'],
    text: '+6 with Bifrost.',
    rule: { bonus: when(6, 'có Bifrost', ctx => hasName(ctx, 'Bifrost')) },
  }),
  ally({ number: 27, id: 'hulk-operations', name: 'Hulk Operations', power: 4, tags: ['Gamma', 'Range', 'Tech'] }),
  ally({
    number: 28, id: 'jane-foster', name: 'Jane Foster', power: 5, tags: ['Worthy', 'Tech'],
    text: '+8 with THOR ODINSON or GOD OF THUNDER.',
    rule: { bonus: when(8, 'có Thor', ctx => hasName(ctx, 'Thor Odinson', 'God of Thunder')) },
  }),
  ally({
    number: 29, id: 'lockheed', name: 'Lockheed', power: 5, tags: ['Range', 'Flight'],
    text: '+7 with SHADOWCAT.',
    rule: { bonus: when(7, 'có Shadowcat', ctx => hasName(ctx, 'Shadowcat')) },
  }),
  ally({
    number: 30, id: 'moira-mactaggert', name: 'Moira MacTaggert', power: 3, tags: ['Intel', 'Tech'],
    text: 'One HERO with Mutant may count one tag twice.',
    rule: {
      choices: hand => [
        NONE,
        ...mutantHeroes(hand).flatMap(d =>
          faceTags(d).map(tag => ({ label: `Moira: ${d.name} ×2 ${tag}`, value: { id: d.id, name: d.name, tag } satisfies TagPick })),
        ),
      ],
      tagMods: [{
        stage: STAGE.DOUBLE,
        apply: ctx => { const p = ctx.choice as TagPick | undefined; if (p) applyDouble(ctx, [p]) },
      }],
    },
  }),
]
```

- [ ] **Step 6: Chạy test độ dài + typecheck, thấy PASS**

Run: `npx vitest run tests/data/heroes.test.ts -t "đủ 23 HERO" && npx tsc`
Expected: PASS; `tsc` không lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/data tests/play.ts tests/data/heroes.test.ts
git commit -m "feat(data): add 23 HERO and 7 ALLY cards"
```

---

### Task 5: Dữ liệu CONDITION, EQUIPMENT, LOCATION, MANEUVER (31 lá)

**Files:**
- Create: `src/data/remix.ts`
- Modify: `src/data/index.ts`
- Test: `tests/data/remix.test.ts`

**Interfaces:**
- Consumes: `define.ts`, helpers, `product`.
- Produces: `CONDITIONS`, `EQUIPMENT`, `LOCATIONS`, `MANEUVERS` (`CardDef[]`), thêm vào `CARDS`.

- [ ] **Step 1: Viết test — `tests/data/remix.test.ts`**

```ts
import { CONDITIONS, EQUIPMENT, LOCATIONS, MANEUVERS } from '../../src/data/remix'
import { cardOf, play } from '../play'

describe('CONDITION/EQUIPMENT/LOCATION/MANEUVER', () => {
  it('đủ số lượng', () => {
    expect([CONDITIONS.length, EQUIPMENT.length, LOCATIONS.length, MANEUVERS.length]).toEqual([5, 6, 13, 7])
  })

  it.each([
    ['assembled', ['assembled', 'hawkeye', 'she-hulk', 'wolverine'], 12],
    ['berserk', ['berserk', 'hawkeye', 'lockheed', 'madripoor'], 12],
    ['fearless', ['fearless', 'hawkeye'], 16],
    ['fearless', ['fearless', 'hawkeye', 'falcon'], 0],
    ['secret-id', ['secret-id', 'hawkeye', 'madripoor'], 8],
    ['secret-id', ['secret-id', 'hawkeye'], 0],
    ['worthy', ['worthy', 'magneto'], 11],
    ['worthy', ['worthy', 'black-cat'], 0],
    ['arc-reactor', ['arc-reactor', 'hawkeye', 'falcon'], 18],
    ['sauron', ['x-jet', 'black-widow', 'lockheed', 'sauron'], 21],
    ['cerebro', ['cerebro'], 8],
    ['spear-of-bashenga', ['spear-of-bashenga', 'cerebro', 'x-jet', 'black-panther'], 21],
    ['mjolnir', ['mjolnir', 'hawkeye'], 0],
    ['mjolnir', ['mjolnir', 'worthy', 'hela'], 10],
    ['mjolnir', ['mjolnir', 'jane-foster'], 10],
    ['vibranium-shield', ['vibranium-shield', 'black-widow'], 9],
    ['vibranium-shield', ['vibranium-shield', 'hawkeye'], 0],
    ['bifrost', ['bifrost', 'factory'], 11],
    ['bifrost', ['bifrost'], 0],
    ['birnin-zana', ['birnin-zana', 'black-panther', 'shuri'], 14],
    ['factory', ['factory', 'beast', 'black-widow'], 20],
    ['halls-of-asgard', ['halls-of-asgard', 'valkyrie', 'heimdall'], 18],
    ['hidden-lair', ['hidden-lair', 'magneto', 'captain-america'], 16],
    ['high-speed-chase', ['high-speed-chase', 'angel', 'hawkeye'], 12],
    ['krakoa', ['krakoa', 'angel', 'beast'], 10],
    ['madripoor', ['madripoor', 'black-widow', 'heimdall'], 16],
    ['remote-fortress', ['remote-fortress', 'magneto'], 15],
    ['remote-fortress', ['remote-fortress', 'black-cat'], 0],
    ['runaway-train', ['runaway-train', 'colossus', 'hawkeye'], 12],
    ['discover-weakness', ['discover-weakness', 'black-widow'], 11],
    ['find-higher-ground', ['find-higher-ground', 'storm', 'lockheed'], 20],
    ['hack-in', ['hack-in', 'hawkeye'], 6],
    ['precise-shot', ['precise-shot', 'heimdall', 'hawkeye'], 12],
    ['throw-car', ['throw-car', 'colossus', 'madripoor'], 14],
    ['throw-car', ['throw-car', 'colossus'], 0],
  ])('%s trong %j = %i', (id, hand, expected) => {
    expect(cardOf(play(hand), id).total).toBe(expected)
  })

  it('Hidden Lair blank VILLAIN khi thiếu 2 Intel', () => {
    expect(cardOf(play(['hidden-lair', 'magneto', 'captain-america']), 'magneto').blanked).toBe(true)
    expect(cardOf(play(['hidden-lair', 'magneto', 'black-widow', 'heimdall']), 'magneto').blanked).toBe(false)
  })

  it('Xavier Mansion nhân đôi Range/Flight để tăng Sauron', () => {
    expect(play(['xavier-mansion', 'cyclops', 'storm', 'sauron']).total).toBe(43)
  })

  it('FAQ Avoid Crossfire: +27 và 21', () => {
    expect(cardOf(play(['avoid-crossfire', 'lockheed', 'storm', 'cyclops']), 'avoid-crossfire').total).toBe(27)
    expect(cardOf(play(['avoid-crossfire', 'hawkeye', 'lockheed']), 'avoid-crossfire').total).toBe(21)
  })

  it('FAQ Hack In + Build Gadgets: +13 cho mỗi Tech', () => {
    expect(cardOf(play(['hack-in', 'build-gadgets', 'hawkeye', 'falcon']), 'build-gadgets').total).toBe(26)
  })
})
```

- [ ] **Step 2: Chạy test độ dài, thấy FAIL**

Run: `npx vitest run tests/data/remix.test.ts -t "đủ số lượng"`
Expected: FAIL — không tìm thấy `remix`.

- [ ] **Step 3: Viết `src/data/remix.ts`**

```ts
import { product } from '../engine/combinatorics'
import {
  applyDouble, blankedUnless, countTags, countType, faceTags, forEachPair, forEachTag, forEachType,
  hasName, hasTypeWithTag, isType, makeBonus, mutantHeroes, others, pickTarget, targetOptions, when,
  withUrbanLocation, type TagPick,
} from '../engine/helpers'
import { STAGE, type Option } from '../engine/types'
import { condition, equipment, location, maneuver } from './define'

const HERO_ALLY = ['HERO', 'ALLY'] as const

export const CONDITIONS = [
  condition({
    number: 31, id: 'assembled', name: 'Assembled', power: 0, tags: [],
    text: '+4 for each HERO.',
    rule: { bonus: forEachType(4, 'HERO') },
  }),
  condition({
    number: 32, id: 'berserk', name: 'Berserk', power: 18, tags: ['Strength', 'Gamma'],
    text: 'Choose a HERO or ALLY. -3 for each OTHER HERO or ALLY and each Urban.',
    rule: {
      bonus: ctx => {
        const n = Math.max(0, countType(ctx, [...HERO_ALLY]) - 1) + countTags(ctx, 'Urban')
        return makeBonus(-3 * n, `-3 × ${n} (HERO/ALLY khác + Urban)`)
      },
    },
  }),
  condition({
    number: 33, id: 'fearless', name: 'Fearless', power: 16, tags: ['Agility'],
    text: 'Blanked if there is more than one HERO in your hand.',
    rule: { selfBlank: ctx => countType(ctx, 'HERO') > 1 },
  }),
  condition({
    number: 34, id: 'secret-id', name: 'Secret ID', power: 8, tags: ['Intel'],
    text: 'Blanked unless with a HERO AND a LOCATION with Urban.',
    rule: { selfBlank: blankedUnless(ctx => countType(ctx, 'HERO', true) >= 1 && withUrbanLocation(ctx)) },
  }),
  condition({
    number: 35, id: 'worthy', name: 'Worthy', power: 11, tags: ['Worthy'],
    text: 'Blanked unless with a VILLAIN with Power greater than 12.',
    rule: { selfBlank: blankedUnless(ctx => others(ctx).some(c => isType(c, 'VILLAIN') && c.power > 12)) },
  }),
]

export const EQUIPMENT = [
  equipment({
    number: 36, id: 'arc-reactor', name: 'Arc Reactor', power: 0, tags: [],
    text: '+9 for each Tech.',
    rule: { bonus: forEachTag(9, 'Tech') },
  }),
  equipment({
    number: 37, id: 'x-jet', name: 'X-Jet', power: 7, tags: [],
    text: 'Add Flight to each HERO and ALLY with no Flight. Add Range to one HERO or ALLY.',
    rule: {
      choices: (hand, self) => targetOptions(hand, self, [...HERO_ALLY], 'thêm Range cho'),
      tagMods: [
        {
          stage: STAGE.ADD,
          apply: ctx => pickTarget(ctx, others(ctx).filter(c => isType(c, [...HERO_ALLY]))).forEach(c => c.tags.push('Range')),
        },
        {
          stage: STAGE.FILL,
          apply: ctx =>
            others(ctx)
              .filter(c => isType(c, [...HERO_ALLY]) && !c.tags.includes('Flight'))
              .forEach(c => c.tags.push('Flight')),
        },
      ],
    },
  }),
  equipment({
    number: 38, id: 'cerebro', name: 'Cerebro', power: 8, tags: ['Intel'],
    text: 'If you take CEREBRO from the discard area, you may swap a card in your hand with a card in the discard area if either has Mutant.',
  }),
  equipment({
    number: 39, id: 'spear-of-bashenga', name: 'Spear of Bashenga', power: 0, tags: ['Wakanda'],
    text: '+7 for each other EQUIPMENT and each other Wakanda.',
    rule: {
      bonus: ctx => [...forEachType(7, 'EQUIPMENT', true)(ctx), ...forEachTag(7, 'Wakanda', true)(ctx)],
    },
  }),
  equipment({
    number: 40, id: 'mjolnir', name: 'Mjolnir', power: 10, tags: ['Flight', 'Range', 'Asgard'],
    text: 'Blanked unless with WORTHY, or unless with a HERO or ALLY with Worthy.',
    rule: { selfBlank: blankedUnless(ctx => hasName(ctx, 'Worthy') || hasTypeWithTag(ctx, [...HERO_ALLY], 'Worthy')) },
  }),
  equipment({
    number: 41, id: 'vibranium-shield', name: 'Vibranium Shield', power: 9, tags: ['Strength', 'Range'],
    text: 'Blanked unless with a HERO with Agility.',
    rule: { selfBlank: blankedUnless(ctx => hasTypeWithTag(ctx, 'HERO', 'Agility')) },
  }),
]

export const LOCATIONS = [
  location({
    number: 42, id: 'bifrost', name: 'Bifrost', power: 0, tags: ['Asgard'],
    text: '+11 with a second LOCATION.',
    rule: { bonus: when(11, 'có LOCATION thứ hai', ctx => countType(ctx, 'LOCATION', true) >= 1) },
  }),
  location({
    number: 43, id: 'birnin-zana', name: 'Birnin Zana', power: 0, tags: ['Urban', 'Wakanda', 'Tech'],
    text: '+7 for each other Wakanda.',
    rule: { bonus: forEachTag(7, 'Wakanda', true) },
  }),
  location({
    number: 44, id: 'factory', name: 'Factory', power: 0, tags: [],
    text: '+5 for each Tech and for each Agility.',
    rule: { bonus: forEachTag(5, ['Tech', 'Agility']) },
  }),
  location({
    number: 45, id: 'falling-debris', name: 'Falling Debris', power: 0, tags: ['Urban'],
    text: '+4 for each Strength and for each Flight.',
    rule: { bonus: forEachTag(4, ['Strength', 'Flight']) },
  }),
  location({
    number: 46, id: 'halls-of-asgard', name: 'Halls of Asgard', power: 0, tags: ['Urban', 'Asgard'],
    text: '+9 for each other Asgard.',
    rule: { bonus: forEachTag(9, 'Asgard', true) },
  }),
  location({
    number: 47, id: 'hidden-lair', name: 'Hidden Lair', power: 16, tags: [],
    text: 'Blank a VILLAIN unless with two or more Intel.',
    rule: {
      choices: (hand, self) => targetOptions(hand, self, 'VILLAIN', 'blank'),
      blank: ctx => (countTags(ctx, 'Intel') >= 2 ? [] : pickTarget(ctx, others(ctx).filter(c => isType(c, 'VILLAIN')))),
    },
  }),
  location({
    number: 48, id: 'high-speed-chase', name: 'High Speed Chase', power: 0, tags: ['Urban'],
    text: '+3 for each Agility, for each Flight, and for each Range.',
    rule: { bonus: forEachTag(3, ['Agility', 'Flight', 'Range']) },
  }),
  location({
    number: 49, id: 'krakoa', name: 'Krakoa, the Living Island', power: 0, tags: [],
    text: '+5 for each Mutant.',
    rule: { bonus: forEachTag(5, 'Mutant') },
  }),
  location({
    number: 50, id: 'madripoor', name: 'Madripoor', power: 0, tags: ['Urban'],
    text: '+8 for each Intel.',
    rule: { bonus: forEachTag(8, 'Intel') },
  }),
  location({
    number: 51, id: 'remote-fortress', name: 'Remote Fortress', power: 15, tags: [],
    text: 'Blanked unless with a VILLAIN with Boss.',
    rule: { selfBlank: blankedUnless(ctx => hasTypeWithTag(ctx, 'VILLAIN', 'Boss')) },
  }),
  location({
    number: 52, id: 'runaway-train', name: 'Runaway Train', power: 0, tags: ['Urban'],
    text: '+4 for each Strength and for each Tech.',
    rule: { bonus: forEachTag(4, ['Strength', 'Tech']) },
  }),
  location({
    number: 53, id: 'skyscraper', name: 'Skyscraper', power: 0, tags: ['Urban'],
    text: '+4 for each Agility and for each Flight.',
    rule: { bonus: forEachTag(4, ['Agility', 'Flight']) },
  }),
  location({
    number: 54, id: 'xavier-mansion', name: 'Xavier Mansion', power: 4, tags: [],
    text: 'Up to three HEROES with Mutant may each count one tag twice.',
    rule: {
      choices: hand => {
        const perHero = mutantHeroes(hand).map(d => [
          undefined,
          ...faceTags(d).map((tag): TagPick => ({ id: d.id, name: d.name, tag })),
        ])
        const out: Option[] = []
        for (const combo of product(perHero)) {
          const picks = combo.filter((p): p is TagPick => p !== undefined)
          if (picks.length > 3) continue
          out.push({
            label: picks.length ? `Xavier Mansion: ${picks.map(p => `${p.name} ×2 ${p.tag}`).join(', ')}` : '',
            value: picks,
          })
        }
        return out
      },
      tagMods: [{ stage: STAGE.DOUBLE, apply: ctx => applyDouble(ctx, (ctx.choice as TagPick[] | undefined) ?? []) }],
    },
  }),
]

export const MANEUVERS = [
  maneuver({
    number: 55, id: 'avoid-crossfire', name: 'Avoid Crossfire', power: 0, tags: [],
    text: '+5|7|9 for each Range if with one|two|three or more cards with Range.',
    rule: {
      bonus: ctx => {
        const cards = ctx.active.filter(c => c.tags.includes('Range')).length
        const per = cards >= 3 ? 9 : cards === 2 ? 7 : cards === 1 ? 5 : 0
        const n = countTags(ctx, 'Range')
        return makeBonus(per * n, `+${per} × ${n} Range (${cards} lá có Range)`)
      },
    },
  }),
  maneuver({
    number: 56, id: 'build-gadgets', name: 'Build Gadgets', power: 0, tags: [],
    text: '+13 for each pair of Tech and Intel.',
    rule: { bonus: forEachPair(13, 'Tech', 'Intel') },
  }),
  maneuver({
    number: 57, id: 'discover-weakness', name: 'Discover Weakness', power: 0, tags: [],
    text: '+11 for each pair of Intel and Agility.',
    rule: { bonus: forEachPair(11, 'Intel', 'Agility') },
  }),
  maneuver({
    number: 58, id: 'find-higher-ground', name: 'Find Higher Ground', power: 0, tags: [],
    text: '+10 for each pair of Flight and Range.',
    rule: { bonus: forEachPair(10, 'Flight', 'Range') },
  }),
  maneuver({
    number: 59, id: 'hack-in', name: 'Hack In', power: 0, tags: ['Intel'],
    text: '+6 for each Tech. Each Tech also counts as Intel.',
    rule: {
      tagMods: [{
        stage: STAGE.ALIAS,
        apply: ctx => ctx.active.forEach(c => {
          const n = c.tags.filter(t => t === 'Tech').length
          for (let i = 0; i < n; i++) c.tags.push('Intel')
        }),
      }],
      bonus: forEachTag(6, 'Tech'),
    },
  }),
  maneuver({
    number: 60, id: 'precise-shot', name: 'Precise Shot', power: 0, tags: [],
    text: '+12 for each pair of Intel and Range.',
    rule: { bonus: forEachPair(12, 'Intel', 'Range') },
  }),
  maneuver({
    number: 61, id: 'throw-car', name: 'Throw Car', power: 0, tags: ['Range'],
    text: '+14 with both Strength and LOCATION with Urban.',
    rule: { bonus: when(14, 'có Strength và LOCATION Urban', ctx => countTags(ctx, 'Strength') >= 1 && withUrbanLocation(ctx)) },
  }),
]
```

- [ ] **Step 4: Thêm vào `src/data/index.ts`**

Thay 2 dòng import/khai báo `CARDS` thành:
```ts
import { ALLIES, HEROES } from './heroes'
import { CONDITIONS, EQUIPMENT, LOCATIONS, MANEUVERS } from './remix'

export const CARDS: CardDef[] = [...HEROES, ...ALLIES, ...CONDITIONS, ...EQUIPMENT, ...LOCATIONS, ...MANEUVERS]
```

- [ ] **Step 5: Chạy test độ dài + typecheck, thấy PASS**

Run: `npx vitest run tests/data/remix.test.ts -t "đủ số lượng" && npx tsc`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data tests/data/remix.test.ts
git commit -m "feat(data): add condition, equipment, location and maneuver cards"
```

---

### Task 6: Dữ liệu VILLAIN (18 lá) + kiểm tra toàn bộ bộ bài, ví dụ sách và FAQ

**Files:**
- Create: `src/data/villains.ts`, `scripts/card-images.json`
- Modify: `src/data/index.ts`
- Test: `tests/data/villains.test.ts`, `tests/data/deck.test.ts`, `tests/data/rulebook.test.ts`

**Interfaces:**
- Produces: `VILLAINS: CardDef[]`; `CARDS` đủ 79 lá; `scripts/card-images.json` (`{ [id]: hash8 }`, dùng ở Task 7).

- [ ] **Step 1: Viết test villain — `tests/data/villains.test.ts`**

```ts
import { VILLAINS } from '../../src/data/villains'
import { cardOf, play } from '../play'

describe('VILLAIN', () => {
  it('đủ 18 lá', () => expect(VILLAINS).toHaveLength(18))

  it.each([
    ['abomination', ['abomination'], -7],
    ['abomination', ['abomination', 'colossus'], 13],
    ['black-cat', ['black-cat', 'madripoor', 'hack-in'], 8],
    ['hela', ['hela', 'valkyrie'], -2],
    ['hela', ['hela', 'valkyrie', 'heimdall'], 18],
    ['baron-zemo', ['baron-zemo', 'hawkeye', 'falcon'], 9],
    ['juggernaut', ['juggernaut', 'madripoor'], 16],
    ['madripoor', ['juggernaut', 'madripoor'], 0],
    ['kang', ['kang', 'angel', 'hela'], 10],
    ['killmonger', ['killmonger', 'black-panther', 'shuri'], 9],
    ['kingpin', ['kingpin', 'madripoor'], 13],
    ['kingpin', ['kingpin'], 0],
    ['mystique', ['mystique', 'heimdall', 'black-widow'], 14],
    ['mystique', ['mystique', 'hawkeye'], -6],
    ['mystique', ['mystique', 'cyclops', 'storm'], 14],
    ['sentinels', ['sentinels', 'cyclops'], -8],
    ['sentinels', ['sentinels', 'cyclops', 'storm'], 12],
    ['hack-in', ['taskmaster', 'hack-in'], 0],
    ['the-leader', ['the-leader', 'colossus', 'she-hulk'], 0],
    ['toad', ['toad', 'magneto'], 14],
    ['toad', ['toad', 'black-cat'], 0],
    ['ultron', ['ultron'], -6],
  ])('%s trong %j = %i', (id, hand, expected) => {
    expect(cardOf(play(hand), id).total).toBe(expected)
  })

  it('Loki trừ power lá rút', () => {
    expect(play(['loki', 'hawkeye'], { lokiDraw: 7 }).total).toBe(13)
  })

  it('Loki bị blank vẫn trừ power lá rút (FAQ)', () => {
    const r = play(['loki', 'magneto', 'hidden-lair', 'captain-america'], { lokiDraw: 5 })
    expect(cardOf(r, 'loki').blanked).toBe(true)
    expect(r.total).toBe(32)
  })

  it('Magneto bỏ mọi Tech nên Hack In không có điểm', () => {
    const r = play(['magneto', 'hack-in', 'hawkeye'])
    expect(cardOf(r, 'hack-in').total).toBe(0)
    expect(r.total).toBe(22)
  })

  it('Selene blank HERO có lợi nhất và trừ power của nó', () => {
    expect(play(['selene', 'captain-america', 'black-widow']).total).toBe(27)
  })

  it('Juggernaut + Hidden Lair: chọn thứ tự để giữ VILLAIN', () => {
    const r = play(['juggernaut', 'hidden-lair', 'captain-america'])
    expect(r.total).toBe(20)
    expect(cardOf(r, 'hidden-lair').blanked).toBe(true)
  })
})
```

- [ ] **Step 2: Viết test bộ bài — `tests/data/deck.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { CARDS } from '../../src/data'
import { CARD_TYPES, TAGS } from '../../src/engine/types'
import { play } from '../play'

describe('bộ bài', () => {
  it('79 lá: 61 REMIX + 18 VILLAIN, đúng số theo loại', () => {
    expect(CARDS).toHaveLength(79)
    expect(CARDS.filter(c => c.deck === 'REMIX')).toHaveLength(61)
    const byType = Object.fromEntries(CARD_TYPES.map(t => [t, CARDS.filter(c => c.type === t).length]))
    expect(byType).toEqual({ HERO: 23, ALLY: 7, CONDITION: 5, EQUIPMENT: 6, LOCATION: 13, MANEUVER: 7, VILLAIN: 18 })
  })

  it('id và number duy nhất, tag hợp lệ, VILLAIN chỉ ở bộ VILLAIN', () => {
    expect(new Set(CARDS.map(c => c.id)).size).toBe(79)
    expect(new Set(CARDS.map(c => c.number)).size).toBe(79)
    for (const c of CARDS) {
      for (const t of [...c.tags, ...(c.transform?.tags ?? [])]) expect(TAGS).toContain(t)
      expect(c.deck === 'VILLAIN').toBe(c.type === 'VILLAIN')
    }
  })

  it('lá không có text chỉ tính base power', () => {
    for (const c of CARDS.filter(c => c.text === '')) {
      expect(play([c.id]).cards[0].total).toBe(c.power)
    }
  })

  it('mỗi lá có đúng 1 ảnh trong scripts/card-images.json', () => {
    const map = JSON.parse(readFileSync('scripts/card-images.json', 'utf-8')) as Record<string, string>
    expect(Object.keys(map).sort()).toEqual(CARDS.map(c => c.id).sort())
    expect(new Set(Object.values(map)).size).toBe(79)
  })

  it('tay bài nhiều lựa chọn vẫn tính xong nhanh', () => {
    const start = performance.now()
    const r = play(['xavier-mansion', 'moira-mactaggert', 'rogue', 'shuri', 'vision', 'x-jet', 'selene'])
    expect(r.total).toBeGreaterThan(0)
    expect(performance.now() - start).toBeLessThan(3000)
  })
})
```

- [ ] **Step 3: Viết test sách hướng dẫn — `tests/data/rulebook.test.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test, thấy FAIL**

Run: `npx vitest run tests/data/villains.test.ts tests/data/deck.test.ts tests/data/rulebook.test.ts`
Expected: FAIL — không tìm thấy `villains`.

- [ ] **Step 5: Viết `src/data/villains.ts`**

```ts
import {
  blankedUnless, countTags, forEachTag, forEachType, hasTypeWithTag, isType, makeBonus, others,
  pickTarget, targetOptions, unless, when, withUrbanLocation,
} from '../engine/helpers'
import { STAGE, TAGS, type Ctx } from '../engine/types'
import { villain } from './define'

const threeCardsShareTag = (ctx: Ctx) => TAGS.some(t => ctx.active.filter(c => c.tags.includes(t)).length >= 3)

export const VILLAINS = [
  villain({
    number: 62, id: 'abomination', name: 'Abomination', power: 13, tags: ['Gamma'],
    text: '-20 unless with two or more Strength.',
    rule: { bonus: unless(-20, 'thiếu 2 Strength', ctx => countTags(ctx, 'Strength') >= 2) },
  }),
  villain({
    number: 63, id: 'black-cat', name: 'Black Cat', power: 8, tags: [],
    text: '+5 with a LOCATION with Urban. -5 for each MANEUVER.',
    rule: { bonus: ctx => [...when(5, 'có LOCATION Urban', withUrbanLocation)(ctx), ...forEachType(-5, 'MANEUVER')(ctx)] },
  }),
  villain({
    number: 64, id: 'hela', name: 'Hela', power: 18, tags: ['Asgard'],
    text: '-20 unless with two or more other Asgard.',
    rule: { bonus: unless(-20, 'thiếu 2 Asgard khác', ctx => countTags(ctx, 'Asgard', true) >= 2) },
  }),
  villain({
    number: 65, id: 'baron-zemo', name: 'Baron Zemo', power: 15, tags: ['Boss'],
    text: '-3 for each HERO.',
    rule: { bonus: forEachType(-3, 'HERO') },
  }),
  villain({
    number: 66, id: 'juggernaut', name: 'Juggernaut', power: 16, tags: ['Mutant'],
    text: 'Blank one LOCATION.',
    rule: {
      choices: (hand, self) => targetOptions(hand, self, 'LOCATION', 'blank'),
      blank: ctx => pickTarget(ctx, others(ctx).filter(c => isType(c, 'LOCATION'))),
    },
  }),
  villain({
    number: 67, id: 'kang', name: 'Kang', power: -10, tags: [],
    text: '+5 for each different tag in your hand.',
    rule: {
      bonus: ctx => {
        const n = new Set(ctx.active.flatMap(c => c.tags)).size
        return makeBonus(5 * n, `+5 × ${n} tag khác nhau`)
      },
    },
  }),
  villain({
    number: 68, id: 'killmonger', name: 'Killmonger', power: -9, tags: ['Wakanda'],
    text: '+9 for each other Wakanda.',
    rule: { bonus: forEachTag(9, 'Wakanda', true) },
  }),
  villain({
    number: 69, id: 'kingpin', name: 'Kingpin', power: 13, tags: ['Boss'],
    text: 'Blanked unless with a LOCATION with Urban.',
    rule: { selfBlank: blankedUnless(withUrbanLocation) },
  }),
  villain({
    number: 70, id: 'loki', name: 'Loki', power: 15, tags: ['Asgard'],
    text: 'At the end of the game, draw a card from the Remix deck and subtract its base power.',
    rule: {
      input: 'lokiDraw',
      always: input => makeBonus(-(input.lokiDraw ?? 0), 'Loki: trừ power lá rút'),
    },
  }),
  villain({
    number: 71, id: 'magneto', name: 'Magneto', power: 17, tags: ['Mutant', 'Boss'],
    text: 'Blank all EQUIPMENT and ignore all Tech. (cards with Tech keep their other details)',
    rule: {
      blank: ctx => others(ctx).filter(c => isType(c, 'EQUIPMENT')),
      tagMods: [{
        stage: STAGE.REMOVE,
        apply: ctx => ctx.active.forEach(c => { c.tags = c.tags.filter(t => t !== 'Tech') }),
      }],
    },
  }),
  villain({
    number: 72, id: 'mystique', name: 'Mystique', power: 14, tags: ['Mutant'],
    text: '-20 unless with two or more Intel OR any three cards sharing the same tag.',
    rule: {
      bonus: unless(-20, 'thiếu 2 Intel hoặc 3 lá chung tag', ctx => countTags(ctx, 'Intel') >= 2 || threeCardsShareTag(ctx)),
    },
  }),
  villain({
    number: 73, id: 'sauron', name: 'Sauron', power: -7, tags: [],
    text: '+7 for each Flight and for each Range.',
    rule: { bonus: forEachTag(7, ['Flight', 'Range']) },
  }),
  villain({
    number: 74, id: 'selene', name: 'Selene', power: 25, tags: ['Mutant'],
    text: 'Blank any HERO or ALLY in your hand. Subtract its base power from your total score.',
    rule: {
      choices: (hand, self) => targetOptions(hand, self, ['HERO', 'ALLY'], 'blank'),
      blank: ctx => pickTarget(ctx, others(ctx).filter(c => isType(c, ['HERO', 'ALLY']))),
      bonus: ctx =>
        ctx.all
          .filter(c => c.blankedBy === ctx.self.def.id)
          .flatMap(c => makeBonus(-c.face.power, `trừ power ${c.face.name}`)),
    },
  }),
  villain({
    number: 75, id: 'sentinels', name: 'Sentinels', power: 12, tags: [],
    text: '-20 unless with two or more Mutant.',
    rule: { bonus: unless(-20, 'thiếu 2 Mutant', ctx => countTags(ctx, 'Mutant') >= 2) },
  }),
  villain({
    number: 76, id: 'taskmaster', name: 'Taskmaster', power: 11, tags: [],
    text: 'Blank all MANEUVERS.',
    rule: { blank: ctx => others(ctx).filter(c => isType(c, 'MANEUVER')) },
  }),
  villain({
    number: 77, id: 'the-leader', name: 'The Leader', power: 12, tags: ['Gamma', 'Boss'],
    text: '-3 for each Strength and other Gamma.',
    rule: {
      bonus: ctx => {
        const n = countTags(ctx, 'Strength') + countTags(ctx, 'Gamma', true)
        return makeBonus(-3 * n, `-3 × ${n} (Strength + Gamma khác)`)
      },
    },
  }),
  villain({
    number: 78, id: 'toad', name: 'Toad', power: 14, tags: ['Mutant'],
    text: 'Blanked unless with another VILLAIN with Boss.',
    rule: { selfBlank: blankedUnless(ctx => hasTypeWithTag(ctx, 'VILLAIN', 'Boss')) },
  }),
  villain({
    number: 79, id: 'ultron', name: 'Ultron', power: 14, tags: ['Boss'],
    text: '-20 unless with two or more Tech.',
    rule: { bonus: unless(-20, 'thiếu 2 Tech', ctx => countTags(ctx, 'Tech') >= 2) },
  }),
]
```

- [ ] **Step 6: Thêm VILLAINS vào `src/data/index.ts` và tạo `scripts/card-images.json`**

`src/data/index.ts` — thêm:
```ts
import { VILLAINS } from './villains'

export const CARDS: CardDef[] = [...HEROES, ...ALLIES, ...CONDITIONS, ...EQUIPMENT, ...LOCATIONS, ...MANEUVERS, ...VILLAINS]
```

`scripts/card-images.json` (hash8 = 8 ký tự đầu của đoạn hash cuối tên file trong `image/`; ảnh trùng `fdb26346` (Jean Grey) và `41ac504a` (Thor) bỏ qua):
```json
{
  "angel": "9e45af74",
  "beast": "e52c233e",
  "black-panther": "331fc708",
  "black-widow": "29502ba0",
  "bruce-banner": "442c9991",
  "captain-america": "0aeb632f",
  "colossus": "a0809555",
  "cyclops": "829c9794",
  "falcon": "0b00ef40",
  "hawkeye": "290214e7",
  "jean-grey": "eb39f5ea",
  "professor-x": "02972a10",
  "rogue": "167c4c2e",
  "shadowcat": "59326cea",
  "she-hulk": "f2816624",
  "shuri": "55a0d126",
  "spider-man": "b17af4d8",
  "storm": "894af970",
  "thor-odinson": "31df4813",
  "tony-stark": "8a4d9228",
  "valkyrie": "013684bf",
  "vision": "1de3aa82",
  "wolverine": "df33c9f3",
  "dora-milaje": "f47b15bd",
  "forge": "d784c9e6",
  "heimdall": "6c0c2bab",
  "hulk-operations": "2c5ddcad",
  "jane-foster": "7ab756d8",
  "lockheed": "b6dd05f0",
  "moira-mactaggert": "cb9d0d16",
  "assembled": "b271360c",
  "berserk": "990ec044",
  "fearless": "9757eff5",
  "secret-id": "6e97c495",
  "worthy": "95738dcb",
  "arc-reactor": "52b942a0",
  "x-jet": "012b8210",
  "cerebro": "b01cb66c",
  "spear-of-bashenga": "4fbf9aa5",
  "mjolnir": "084137b0",
  "vibranium-shield": "304f74b5",
  "bifrost": "53d58105",
  "birnin-zana": "763f81ee",
  "factory": "b81f3e03",
  "falling-debris": "f69f6bb0",
  "halls-of-asgard": "4a934534",
  "hidden-lair": "279e5c12",
  "high-speed-chase": "51c53d55",
  "krakoa": "a8ecbb4e",
  "madripoor": "047691d9",
  "remote-fortress": "46f2851b",
  "runaway-train": "547d3994",
  "skyscraper": "1e1402fb",
  "xavier-mansion": "0cd133d8",
  "avoid-crossfire": "306a9af1",
  "build-gadgets": "af84814a",
  "discover-weakness": "4339d494",
  "find-higher-ground": "07332fd5",
  "hack-in": "f1424506",
  "precise-shot": "c8393dec",
  "throw-car": "de83956f",
  "abomination": "69e081fe",
  "black-cat": "32d8fe6b",
  "hela": "465fafd8",
  "baron-zemo": "c95281ff",
  "juggernaut": "3f1e65d7",
  "kang": "aca35afa",
  "killmonger": "49a9e2e4",
  "kingpin": "d08d6d7d",
  "loki": "bf428033",
  "magneto": "b07d6d26",
  "mystique": "5e1c958f",
  "sauron": "384b7690",
  "selene": "41120d6f",
  "sentinels": "4fdce74a",
  "taskmaster": "755c588f",
  "the-leader": "a41ab4fe",
  "toad": "12105f80",
  "ultron": "93fa7a1c"
}
```

- [ ] **Step 7: Chạy toàn bộ test + typecheck, thấy PASS**

Run: `npm test && npx tsc`
Expected: mọi test PASS (kể cả `tests/data/heroes.test.ts` và `remix.test.ts` giờ đã có đủ lá).

Nếu một dòng trong bảng lệch số: đọc lại text lá trong ảnh gốc (`image/…<hash8>…jpg`), sửa **luật** nếu code sai; chỉ sửa **số kỳ vọng** khi tính tay lại theo text lá cho kết quả khác — ghi lý do vào commit.

- [ ] **Step 8: Commit**

```bash
git add src/data scripts/card-images.json tests/data
git commit -m "feat(data): add 18 VILLAIN cards, deck integrity and rulebook tests"
```

---

### Task 7: Xử lý ảnh lá bài

**Files:**
- Create: `scripts/requirements.txt`, `scripts/process_images.py`
- Create (output): `public/cards/<id>.webp` × 79

**Interfaces:**
- Consumes: `scripts/card-images.json`, ảnh gốc `image/*.jpg`.
- Produces: `public/cards/<id>.webp` (400×559), dùng bởi `CardImage` (Task 9) qua `${BASE_URL}cards/${id}.webp`.

- [ ] **Step 1: Viết `scripts/requirements.txt`**

```
opencv-python-headless>=4.8
numpy>=1.24
```

- [ ] **Step 2: Viết `scripts/process_images.py`**

```python
"""Cắt nền, xoay thẳng và nén ảnh lá bài.

image/*.jpg  →  public/cards/<id>.webp  (+ scripts/contact-sheet.jpg để kiểm tra bằng mắt)

Chạy:
    pip install -r scripts/requirements.txt
    python scripts/process_images.py
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "image"
OUT = ROOT / "public" / "cards"
MAP = ROOT / "scripts" / "card-images.json"
SHEET = ROOT / "scripts" / "contact-sheet.jpg"
W, H = 400, 559  # tỉ lệ lá 63 × 88 mm

# Ảnh chụp nằm ngang có đầu lá ở bên phải → mặc định xoay ngược chiều kim đồng hồ.
# Ghi đè khi contact sheet cho thấy lá bị ngược: "cw" | "ccw" | "180" | "none"
ROTATION_OVERRIDES: dict[str, str] = {}
ROTATIONS = {
    "cw": cv2.ROTATE_90_CLOCKWISE,
    "ccw": cv2.ROTATE_90_COUNTERCLOCKWISE,
    "180": cv2.ROTATE_180,
}


def order_points(pts: np.ndarray) -> np.ndarray:
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[s.argmin()], pts[d.argmin()], pts[s.argmax()], pts[d.argmax()]], dtype="float32")


def find_card(img: np.ndarray):
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (7, 7), 0)
    edges = cv2.dilate(cv2.Canny(gray, 30, 100), np.ones((5, 5), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    if cv2.contourArea(c) < 0.15 * img.shape[0] * img.shape[1]:
        return None
    approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
    return approx if len(approx) == 4 else cv2.boxPoints(cv2.minAreaRect(c))


def warp(img: np.ndarray, quad) -> np.ndarray:
    tl, tr, br, bl = order_points(np.array(quad))
    w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    m = cv2.getPerspectiveTransform(np.array([tl, tr, br, bl]), dst)
    return cv2.warpPerspective(img, m, (w, h))


def source_for(hash8: str, files: list[Path]) -> Path:
    matches = [f for f in files if f.stem.split("_")[-1].startswith(hash8)]
    if len(matches) != 1:
        raise SystemExit(f"hash {hash8}: tìm thấy {len(matches)} file")
    return matches[0]


def main() -> None:
    mapping: dict[str, str] = json.loads(MAP.read_text(encoding="utf-8"))
    files = sorted(SRC.glob("*.jpg"))
    OUT.mkdir(parents=True, exist_ok=True)
    fallback: list[str] = []
    thumbs: list[np.ndarray] = []

    for card_id, hash8 in mapping.items():
        img = cv2.imread(str(source_for(hash8, files)))
        quad = find_card(img)
        if quad is None:
            fallback.append(card_id)
            card = img
        else:
            card = warp(img, quad)
        rot = ROTATION_OVERRIDES.get(card_id, "ccw" if card.shape[1] > card.shape[0] else "none")
        if rot in ROTATIONS:
            card = cv2.rotate(card, ROTATIONS[rot])
        card = cv2.resize(card, (W, H), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(OUT / f"{card_id}.webp"), card, [cv2.IMWRITE_WEBP_QUALITY, 80])
        thumb = cv2.resize(card, (120, 168))
        cv2.putText(thumb, card_id[:14], (2, 162), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
        thumbs.append(thumb)

    cols = 10
    blank = np.zeros_like(thumbs[0])
    rows = [thumbs[i:i + cols] + [blank] * (cols - len(thumbs[i:i + cols])) for i in range(0, len(thumbs), cols)]
    cv2.imwrite(str(SHEET), np.vstack([np.hstack(r) for r in rows]))

    print(f"Đã xuất {len(thumbs)} ảnh vào {OUT}")
    if fallback:
        print("Không tìm thấy viền lá (dùng nguyên ảnh):", ", ".join(fallback))


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Cài thư viện và chạy**

Run:
```bash
pip install -r scripts/requirements.txt
python scripts/process_images.py
```
Expected: `Đã xuất 79 ảnh vào …/public/cards`; `ls public/cards | wc -l` = 79.

- [ ] **Step 4: Kiểm tra contact sheet bằng mắt**

Mở `scripts/contact-sheet.jpg` (dùng Read tool). Với mỗi lá: đứng thẳng (tên + power ở trên), cắt sát viền, không lẫn nền.
- Lá bị ngược/nằm ngang → thêm `"<id>": "180" | "cw" | "ccw"` vào `ROTATION_OVERRIDES`.
- Lá cắt sai (lẫn nền, mất góc) → xử lý riêng lá đó: chỉnh tham số `Canny`/`0.15` hoặc thêm cắt tay (tọa độ) cho id đó.
Chạy lại Step 3 đến khi cả 79 lá đạt.

- [ ] **Step 5: Commit**

```bash
git add scripts/requirements.txt scripts/process_images.py public/cards
git commit -m "feat(images): crop, straighten and compress card photos to WebP"
```

---

### Task 8: Trạng thái ván chơi

**Files:**
- Create: `src/state/game.ts`
- Test: `tests/state/game.test.ts`

**Interfaces:**
- Consumes: `CARD_BY_ID`, `getCard` (Task 4–6), `HandResult` (Task 2).
- Produces:
  - Hằng: `HAND_SIZE = 7`, `MIN_PLAYERS = 2`, `MAX_PLAYERS = 6`, `STORAGE_KEY`.
  - Kiểu: `Screen = 'setup' | 'pick' | 'result'`, `Player { id; name; hand: string[]; lokiDraw?: number }`, `GameState { screen; players; activePlayer; nextId }`, `Action` (union bên dưới).
  - Hàm: `initialState()`, `reducer(state, action)`, `ownerOf(state, cardId): Player | undefined`, `rankPlayers(scores: {id; total}[]): {id; total; rank; winner}[]`, `handWarnings(player: Player, result: HandResult): string[]`, `loadState(storage?)`, `saveState(state, storage?)`.

- [ ] **Step 1: Viết test — `tests/state/game.test.ts`**

```ts
import {
  HAND_SIZE, MAX_PLAYERS, STORAGE_KEY, handWarnings, initialState, loadState, ownerOf, rankPlayers, reducer,
  saveState, type Action, type GameState,
} from '../../src/state/game'
import { play } from '../play'

const apply = (actions: Action[], s: GameState = initialState()) => actions.reduce(reducer, s)
const memory = (init: Record<string, string> = {}) => {
  const data = { ...init }
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v }, data }
}

describe('reducer', () => {
  it('bắt đầu với 2 người, thêm tối đa 6, xóa tối thiểu còn 2', () => {
    let s = initialState()
    expect(s.players.map(p => p.name)).toEqual(['Người 1', 'Người 2'])
    for (let i = 0; i < 10; i++) s = reducer(s, { type: 'addPlayer' })
    expect(s.players).toHaveLength(MAX_PLAYERS)
    for (const p of [...s.players]) s = reducer(s, { type: 'removePlayer', id: p.id })
    expect(s.players).toHaveLength(2)
  })

  it('không cho 2 người giữ cùng 1 lá, không quá 7 lá', () => {
    let s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }, { type: 'selectPlayer', index: 1 }, { type: 'addCard', cardId: 'angel' }])
    expect(s.players[1].hand).toEqual([])
    expect(ownerOf(s, 'angel')?.id).toBe(s.players[0].id)
    const ids = ['beast', 'storm', 'hawkeye', 'falcon', 'cyclops', 'rogue', 'shuri', 'vision']
    for (const cardId of ids) s = reducer(s, { type: 'addCard', cardId })
    expect(s.players[1].hand).toHaveLength(HAND_SIZE)
  })

  it('xóa người chơi trả lại lá của họ', () => {
    let s = apply([{ type: 'addPlayer' }, { type: 'start' }, { type: 'selectPlayer', index: 2 }, { type: 'addCard', cardId: 'loki' }])
    s = reducer(s, { type: 'removePlayer', id: s.players[2].id })
    expect(ownerOf(s, 'loki')).toBeUndefined()
    expect(s.activePlayer).toBe(1)
  })

  it('ván mới xóa tay bài nhưng giữ tên', () => {
    let s = apply([{ type: 'renamePlayer', id: 'p1', name: 'Minh' }, { type: 'start' }, { type: 'addCard', cardId: 'angel' }, { type: 'setLokiDraw', value: 3 }])
    s = reducer(s, { type: 'newGame' })
    expect(s).toMatchObject({ screen: 'setup', activePlayer: 0 })
    expect(s.players[0]).toMatchObject({ name: 'Minh', hand: [], lokiDraw: undefined })
  })

  it('start điền tên mặc định cho tên trống', () => {
    const s = apply([{ type: 'renamePlayer', id: 'p2', name: '  ' }, { type: 'start' }])
    expect(s.players[1].name).toBe('Người 2')
    expect(s.screen).toBe('pick')
  })
})

describe('rankPlayers', () => {
  it('xếp hạng và hòa thì cùng thắng', () => {
    expect(rankPlayers([{ id: 'a', total: 10 }, { id: 'b', total: 30 }, { id: 'c', total: 30 }])).toEqual([
      { id: 'b', total: 30, rank: 1, winner: true },
      { id: 'c', total: 30, rank: 1, winner: true },
      { id: 'a', total: 10, rank: 3, winner: false },
    ])
  })
})

describe('handWarnings', () => {
  const player = (hand: string[], lokiDraw?: number) => ({ id: 'p1', name: 'A', hand, lokiDraw })
  it('cảnh báo thiếu VILLAIN / HERO-ALLY', () => {
    const hand = ['angel']
    expect(handWarnings(player(hand), play(hand))).toEqual(['Thiếu HERO/ALLY hoặc VILLAIN (không bị blank) → tay bài 0 điểm.'])
  })
  it('cảnh báo chưa nhập lá Loki rút', () => {
    const hand = ['loki', 'angel']
    expect(handWarnings(player(hand), play(hand))).toEqual(['Chưa nhập power lá Loki rút — đang tính là 0.'])
    expect(handWarnings(player(hand, 4), play(hand, { lokiDraw: 4 }))).toEqual([])
  })
  it('tay rỗng không cảnh báo', () => {
    expect(handWarnings(player([]), play([]))).toEqual([])
  })
})

describe('load/save', () => {
  it('lưu rồi đọc lại đúng trạng thái', () => {
    const store = memory()
    const s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }])
    saveState(s, store)
    expect(loadState(store)).toEqual(s)
  })
  it('JSON hỏng hoặc sai cấu trúc → ván mới', () => {
    expect(loadState(memory({ [STORAGE_KEY]: '{oops' }))).toEqual(initialState())
    expect(loadState(memory({ [STORAGE_KEY]: '{"players":[]}' }))).toEqual(initialState())
  })
  it('id lá không còn tồn tại bị loại bỏ', () => {
    const s = apply([{ type: 'start' }, { type: 'addCard', cardId: 'angel' }])
    const raw = JSON.stringify({ ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, hand: ['angel', 'old-card'] } : p)) })
    expect(loadState(memory({ [STORAGE_KEY]: raw })).players[0].hand).toEqual(['angel'])
  })
  it('storage ném lỗi → không crash', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(loadState(broken)).toEqual(initialState())
    expect(() => saveState(initialState(), broken)).not.toThrow()
  })
})
```

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `npx vitest run tests/state/game.test.ts`
Expected: FAIL — không tìm thấy `state/game`.

- [ ] **Step 3: Viết `src/state/game.ts`**

```ts
import { CARD_BY_ID, getCard } from '../data'
import type { HandResult } from '../engine/score'

export const HAND_SIZE = 7
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const STORAGE_KEY = 'marvel-remix-scorer/v1'

export type Screen = 'setup' | 'pick' | 'result'

export interface Player {
  id: string
  name: string
  hand: string[]
  lokiDraw?: number
}

export interface GameState {
  screen: Screen
  players: Player[]
  activePlayer: number
  nextId: number
}

export type Action =
  | { type: 'addPlayer' }
  | { type: 'removePlayer'; id: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'start' }
  | { type: 'backToSetup' }
  | { type: 'selectPlayer'; index: number }
  | { type: 'addCard'; cardId: string }
  | { type: 'removeCard'; cardId: string }
  | { type: 'setLokiDraw'; value: number | undefined }
  | { type: 'showResults' }
  | { type: 'editHands' }
  | { type: 'newGame' }

const defaultName = (n: number) => `Người ${n}`
const newPlayer = (n: number): Player => ({ id: `p${n}`, name: defaultName(n), hand: [] })

export function initialState(): GameState {
  return { screen: 'setup', players: [newPlayer(1), newPlayer(2)], activePlayer: 0, nextId: 3 }
}

export const ownerOf = (state: GameState, cardId: string) => state.players.find(p => p.hand.includes(cardId))

function updateActive(state: GameState, f: (p: Player) => Player): GameState {
  return { ...state, players: state.players.map((p, i) => (i === state.activePlayer ? f(p) : p)) }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'addPlayer':
      if (state.players.length >= MAX_PLAYERS) return state
      return { ...state, players: [...state.players, newPlayer(state.nextId)], nextId: state.nextId + 1 }
    case 'removePlayer': {
      if (state.players.length <= MIN_PLAYERS) return state
      const players = state.players.filter(p => p.id !== action.id)
      return { ...state, players, activePlayer: Math.min(state.activePlayer, players.length - 1) }
    }
    case 'renamePlayer':
      return { ...state, players: state.players.map(p => (p.id === action.id ? { ...p, name: action.name } : p)) }
    case 'start':
      return {
        ...state,
        screen: 'pick',
        players: state.players.map((p, i) => ({ ...p, name: p.name.trim() || defaultName(i + 1) })),
      }
    case 'backToSetup':
      return { ...state, screen: 'setup' }
    case 'selectPlayer':
      return { ...state, activePlayer: Math.max(0, Math.min(action.index, state.players.length - 1)) }
    case 'addCard': {
      const p = state.players[state.activePlayer]
      if (p.hand.length >= HAND_SIZE || ownerOf(state, action.cardId) || !CARD_BY_ID.has(action.cardId)) return state
      return updateActive(state, pl => ({ ...pl, hand: [...pl.hand, action.cardId] }))
    }
    case 'removeCard':
      return updateActive(state, pl => ({ ...pl, hand: pl.hand.filter(id => id !== action.cardId) }))
    case 'setLokiDraw':
      return updateActive(state, pl => ({ ...pl, lokiDraw: action.value }))
    case 'showResults':
      return { ...state, screen: 'result' }
    case 'editHands':
      return { ...state, screen: 'pick' }
    case 'newGame':
      return {
        ...state,
        screen: 'setup',
        activePlayer: 0,
        players: state.players.map(p => ({ ...p, hand: [], lokiDraw: undefined })),
      }
  }
}

export function rankPlayers(scores: { id: string; total: number }[]) {
  const sorted = [...scores].sort((a, b) => b.total - a.total)
  const top = sorted[0]?.total
  return sorted.map(s => ({
    ...s,
    rank: 1 + sorted.filter(o => o.total > s.total).length,
    winner: s.total === top,
  }))
}

export function handWarnings(player: Player, result: HandResult): string[] {
  const out: string[] = []
  if (player.hand.length > 0 && !result.valid) out.push('Thiếu HERO/ALLY hoặc VILLAIN (không bị blank) → tay bài 0 điểm.')
  const needsLoki = player.hand.some(id => getCard(id).rule.input === 'lokiDraw')
  if (needsLoki && player.lokiDraw === undefined) out.push('Chưa nhập power lá Loki rút — đang tính là 0.')
  return out
}

// ---- lưu trữ ----
type Store = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): Store | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function sanitize(raw: unknown): GameState | undefined {
  const s = raw as Partial<GameState> | null
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS) return undefined
  if (s.screen !== 'setup' && s.screen !== 'pick' && s.screen !== 'result') return undefined
  const seen = new Set<string>()
  const players: Player[] = []
  for (const p of s.players) {
    if (typeof p?.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.hand)) return undefined
    const hand = p.hand.filter(id => typeof id === 'string' && CARD_BY_ID.has(id) && !seen.has(id)).slice(0, HAND_SIZE)
    hand.forEach(id => seen.add(id))
    players.push({ id: p.id, name: p.name, hand, lokiDraw: typeof p.lokiDraw === 'number' ? p.lokiDraw : undefined })
  }
  const activePlayer = Number.isInteger(s.activePlayer) ? Math.min(Math.max(0, s.activePlayer!), players.length - 1) : 0
  const nextId = Number.isInteger(s.nextId) ? s.nextId! : players.length + 1
  return { screen: s.screen, players, activePlayer, nextId }
}

export function loadState(store: Store | undefined = defaultStore()): GameState {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    return (raw && sanitize(JSON.parse(raw))) || initialState()
  } catch {
    return initialState()
  }
}

export function saveState(state: GameState, store: Store | undefined = defaultStore()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // bộ nhớ bị chặn/đầy: bỏ qua, ván vẫn chơi được
  }
}
```

> Lưu ý test "lưu rồi đọc lại": `sanitize` giữ `lokiDraw: undefined` còn JSON bỏ trường này; `toEqual` coi hai trường hợp như nhau nên test pass.

- [ ] **Step 4: Chạy test + typecheck, thấy PASS**

Run: `npx vitest run tests/state && npx tsc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state tests/state
git commit -m "feat(state): game reducer, ranking, warnings and safe persistence"
```

---

### Task 9: Khung giao diện + màn Thiết lập + ảnh lá + CSS

**Files:**
- Create: `src/ui/types.ts`, `src/ui/CardImage.tsx`, `src/ui/SetupScreen.tsx`
- Modify: `src/App.tsx`, `src/styles.css`
- Test: `tests/ui/app.test.tsx`

**Interfaces:**
- Consumes: `reducer`, `loadState`, `saveState`, `MIN_PLAYERS`, `MAX_PLAYERS` (Task 8).
- Produces: `ScreenProps { state: GameState; dispatch: Dispatch<Action> }`; `CardImage({ card, transformed?, className? })`; `TYPE_COLORS: Record<CardType, string>` (trong `CardImage.tsx`).

- [ ] **Step 1: Viết test — `tests/ui/app.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `npx vitest run tests/ui/app.test.tsx`
Expected: FAIL — không có nút "+ Thêm người chơi".

- [ ] **Step 3: Viết `src/ui/types.ts`, `src/ui/CardImage.tsx`, `src/ui/SetupScreen.tsx`**

`src/ui/types.ts`:
```ts
import type { Dispatch } from 'react'
import type { Action, GameState } from '../state/game'

export interface ScreenProps {
  state: GameState
  dispatch: Dispatch<Action>
}
```

`src/ui/CardImage.tsx`:
```tsx
import type { CardDef, CardType } from '../engine/types'

export const TYPE_COLORS: Record<CardType, string> = {
  HERO: '#1e88e5',
  ALLY: '#8e24aa',
  CONDITION: '#43a047',
  EQUIPMENT: '#757575',
  LOCATION: '#fb8c00',
  MANEUVER: '#d81b60',
  VILLAIN: '#c62828',
}

export function CardImage({ card, transformed = false, className = '' }: { card: CardDef; transformed?: boolean; className?: string }) {
  const name = transformed && card.transform ? card.transform.name : card.name
  return (
    <img
      className={`card-img ${transformed ? 'is-transformed' : ''} ${className}`}
      src={`${import.meta.env.BASE_URL}cards/${card.id}.webp`}
      alt={name}
      loading="lazy"
    />
  )
}
```

`src/ui/SetupScreen.tsx`:
```tsx
import { MAX_PLAYERS, MIN_PLAYERS } from '../state/game'
import type { ScreenProps } from './types'

export function SetupScreen({ state, dispatch }: ScreenProps) {
  return (
    <main className="screen">
      <h1>Marvel Remix — Tính điểm</h1>
      <p className="hint">Nhập tên {MIN_PLAYERS}–{MAX_PLAYERS} người chơi.</p>
      <ul className="player-list">
        {state.players.map(p => (
          <li key={p.id}>
            <input
              aria-label="Tên người chơi"
              value={p.name}
              onChange={e => dispatch({ type: 'renamePlayer', id: p.id, name: e.target.value })}
            />
            <button
              className="icon"
              aria-label={`Xóa ${p.name}`}
              disabled={state.players.length <= MIN_PLAYERS}
              onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button disabled={state.players.length >= MAX_PLAYERS} onClick={() => dispatch({ type: 'addPlayer' })}>
          + Thêm người chơi
        </button>
        <button className="primary" onClick={() => dispatch({ type: 'start' })}>
          Bắt đầu tính điểm
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Viết `src/App.tsx` (PickScreen/ResultScreen tạm là khung, hoàn thiện ở Task 10–11)**

```tsx
import { useEffect, useReducer } from 'react'
import { loadState, reducer, saveState } from './state/game'
import { PickScreen } from './ui/PickScreen'
import { ResultScreen } from './ui/ResultScreen'
import { SetupScreen } from './ui/SetupScreen'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState())
  useEffect(() => saveState(state), [state])
  const props = { state, dispatch }
  if (state.screen === 'pick') return <PickScreen {...props} />
  if (state.screen === 'result') return <ResultScreen {...props} />
  return <SetupScreen {...props} />
}
```

Tạo khung tạm để App biên dịch được:

`src/ui/PickScreen.tsx`:
```tsx
import type { ScreenProps } from './types'

export function PickScreen({ state }: ScreenProps) {
  return <main className="screen"><h2>Tay bài của {state.players[state.activePlayer].name}</h2></main>
}
```

`src/ui/ResultScreen.tsx`:
```tsx
import type { ScreenProps } from './types'

export function ResultScreen(_: ScreenProps) {
  return <main className="screen"><h1>Kết quả</h1></main>
}
```

- [ ] **Step 5: Viết `src/styles.css`**

```css
:root {
  --bg: #f4f5f7;
  --surface: #ffffff;
  --text: #1c1d21;
  --muted: #6b6f7a;
  --border: #d9dce3;
  --primary: #c62828;
  --primary-text: #ffffff;
  --warning-bg: #fff4e5;
  --warning-text: #8a4b00;
  --winner: #f9a825;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121317;
    --surface: #1c1e24;
    --text: #eceef3;
    --muted: #a0a4af;
    --border: #33363f;
    --primary: #ef5350;
    --warning-bg: #3a2a12;
    --warning-text: #ffcc80;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
button { font: inherit; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
button.primary { background: var(--primary); color: var(--primary-text); border-color: var(--primary); font-weight: 600; }
button.icon { padding: 6px 10px; }
input { font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); width: 100%; }

.screen { max-width: 960px; margin: 0 auto; padding: 16px 16px 96px; }
h1 { font-size: 1.5rem; margin: 8px 0 4px; }
h2 { font-size: 1.1rem; margin: 0; }
.hint { color: var(--muted); margin-top: 0; }
.warning { background: var(--warning-bg); color: var(--warning-text); padding: 8px 12px; border-radius: 8px; margin: 8px 0 0; }

.player-list { list-style: none; padding: 0; display: grid; gap: 8px; }
.player-list li { display: flex; gap: 8px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; }
footer.actions { position: fixed; left: 0; right: 0; bottom: 0; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--border); }

.card-img { width: 100%; aspect-ratio: 400 / 559; object-fit: cover; border-radius: 6px; display: block; }
.card-img.is-transformed { transform: rotate(180deg); }

.player-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; }
.player-tabs button { white-space: nowrap; }
.player-tabs button.active { border-color: var(--primary); box-shadow: inset 0 -3px 0 var(--primary); }

.tray { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 12px; position: sticky; top: 0; z-index: 1; }
.tray-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.live-score { font-size: 1.4rem; font-weight: 700; }
.slots { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.slot { padding: 0; border: none; background: none; position: relative; }
.slot.empty { aspect-ratio: 400 / 559; border: 2px dashed var(--border); border-radius: 6px; }
.slot.is-blanked .card-img { filter: grayscale(1) opacity(.5); }
.slot-score { position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,.75); color: #fff; font-size: .75rem; padding: 1px 5px; border-radius: 6px; }
.loki { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.loki input { width: 90px; }

.library-controls { display: grid; gap: 8px; margin-bottom: 8px; }
.type-tabs { display: flex; gap: 6px; overflow-x: auto; }
.type-tabs button { border-left: 4px solid var(--type-color); white-space: nowrap; }
.type-tabs button.active { background: var(--type-color); color: #fff; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.lib-card { padding: 0; border: none; background: none; position: relative; }
.lib-card.is-taken .card-img { filter: grayscale(1) opacity(.4); }
.taken-label { position: absolute; inset: auto 0 0 0; background: rgba(0,0,0,.75); color: #fff; font-size: .7rem; padding: 2px 4px; border-radius: 0 0 6px 6px; }

.ranking { list-style: none; padding: 0; display: grid; gap: 8px; }
.ranking > li > button { width: 100%; display: flex; gap: 12px; align-items: center; text-align: left; }
.ranking > li > button strong { margin-left: auto; font-size: 1.2rem; }
.ranking > li.winner > button { border-color: var(--winner); border-width: 2px; }
.breakdown { padding: 8px 4px; overflow-x: auto; }
.breakdown table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.breakdown th, .breakdown td { border-bottom: 1px solid var(--border); padding: 6px; text-align: left; vertical-align: top; }
.breakdown td:last-child, .breakdown th:last-child { text-align: right; font-weight: 600; }
.breakdown tr.is-blanked td { color: var(--muted); text-decoration: line-through; }
.choices { color: var(--muted); font-size: .85rem; }

@media (max-width: 520px) {
  .slots { grid-template-columns: repeat(4, 1fr); }
}
```

- [ ] **Step 6: Chạy test + typecheck + build, thấy PASS**

Run: `npm test && npx tsc && npm run build`
Expected: mọi test PASS, build ra `dist/`.

- [ ] **Step 7: Commit**

```bash
git add src tests/ui
git commit -m "feat(ui): app shell, setup screen, card image and styles"
```

---

### Task 10: Màn Chọn bài (khay tay bài + thư viện lá)

**Files:**
- Create: `src/ui/HandTray.tsx`, `src/ui/CardLibrary.tsx`
- Modify: `src/ui/PickScreen.tsx`
- Test: `tests/ui/app.test.tsx` (thêm test)

**Interfaces:**
- Consumes: `CARDS`, `getCard`, `scoreHand`, `HandResult`, `ownerOf`, `handWarnings`, `HAND_SIZE`, `CardImage`, `TYPE_COLORS`, `CARD_TYPES`.
- Produces: `HandTray({ player, result, dispatch })`, `CardLibrary({ state, dispatch })`, `PickScreen` hoàn chỉnh.

- [ ] **Step 1: Thêm test vào `tests/ui/app.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `npx vitest run tests/ui/app.test.tsx`
Expected: FAIL — không có nút "Angel".

- [ ] **Step 3: Viết `src/ui/HandTray.tsx`**

```tsx
import type { Dispatch } from 'react'
import { getCard } from '../data'
import type { HandResult } from '../engine/score'
import { HAND_SIZE, handWarnings, type Action, type Player } from '../state/game'
import { CardImage } from './CardImage'

export function HandTray({ player, result, dispatch }: { player: Player; result: HandResult; dispatch: Dispatch<Action> }) {
  const byId = new Map(result.cards.map(c => [c.id, c]))
  const needsLoki = player.hand.some(id => getCard(id).rule.input === 'lokiDraw')
  return (
    <section className="tray">
      <div className="tray-header">
        <h2>Tay bài của {player.name}</h2>
        <div className="live-score" aria-label="Điểm tạm tính" aria-live="polite">{result.total} điểm</div>
      </div>
      <div className="slots">
        {Array.from({ length: HAND_SIZE }, (_, i) => {
          const id = player.hand[i]
          if (!id) return <div key={`empty-${i}`} className="slot empty" />
          const r = byId.get(id)
          return (
            <button
              key={id}
              className={`slot ${r?.blanked ? 'is-blanked' : ''}`}
              title="Bấm để bỏ lá khỏi tay"
              onClick={() => dispatch({ type: 'removeCard', cardId: id })}
            >
              <CardImage card={getCard(id)} transformed={r?.transformed} />
              <span className="slot-score">{r?.total ?? 0}</span>
            </button>
          )
        })}
      </div>
      {needsLoki && (
        <label className="loki">
          Loki — power lá rút từ REMIX:
          <input
            type="number"
            inputMode="numeric"
            value={player.lokiDraw ?? ''}
            onChange={e => dispatch({ type: 'setLokiDraw', value: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
      )}
      {handWarnings(player, result).map(w => (
        <p key={w} className="warning">{w}</p>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Viết `src/ui/CardLibrary.tsx`**

```tsx
import { useState, type CSSProperties } from 'react'
import { CARDS } from '../data'
import { CARD_TYPES, type CardDef, type CardType } from '../engine/types'
import { HAND_SIZE, ownerOf } from '../state/game'
import { CardImage, TYPE_COLORS } from './CardImage'
import type { ScreenProps } from './types'

const searchText = (c: CardDef) => `${c.name} ${c.transform?.name ?? ''}`.toLowerCase()
const byNumber = (a: CardDef, b: CardDef) => a.number - b.number

export function CardLibrary({ state, dispatch }: ScreenProps) {
  const [tab, setTab] = useState<CardType>('HERO')
  const [query, setQuery] = useState('')
  const player = state.players[state.activePlayer]
  const full = player.hand.length >= HAND_SIZE
  const q = query.trim().toLowerCase()
  const list = CARDS.filter(c => (q ? searchText(c).includes(q) : c.type === tab)).sort(byNumber)

  return (
    <section>
      <div className="library-controls">
        <input type="search" placeholder="Tìm theo tên…" value={query} onChange={e => setQuery(e.target.value)} />
        <nav className="type-tabs" role="tablist">
          {CARD_TYPES.map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={!q && tab === t}
              className={!q && tab === t ? 'active' : ''}
              style={{ '--type-color': TYPE_COLORS[t] } as CSSProperties}
              onClick={() => { setTab(t); setQuery('') }}
            >
              {t} <small>{CARDS.filter(c => c.type === t).length}</small>
            </button>
          ))}
        </nav>
        {full && <p className="hint">Tay bài đã đủ {HAND_SIZE} lá — bấm lá trong khay để bỏ bớt.</p>}
      </div>
      <div className="grid">
        {list.map(c => {
          const owner = ownerOf(state, c.id)
          return (
            <button
              key={c.id}
              aria-label={c.name}
              className={`lib-card ${owner ? 'is-taken' : ''}`}
              disabled={!!owner || full}
              onClick={() => dispatch({ type: 'addCard', cardId: c.id })}
            >
              <CardImage card={c} />
              {owner && <span className="taken-label">{owner.id === player.id ? 'Trong tay' : `Đang ở tay ${owner.name}`}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

> `aria-label={c.name}` trên nút thư viện giúp test/tiếp cận tìm đúng lá; ảnh bên trong vẫn có `alt`. Test dùng `getByRole('button', { name: 'Angel' })` — nút trong khay không có aria-label nên tên truy cập của nó là alt ảnh "Angel" → khi lá đã vào khay, test chỉ click nút thư viện **trước** khi lá vào khay (đúng như test viết).

- [ ] **Step 5: Viết `src/ui/PickScreen.tsx`**

```tsx
import { useMemo } from 'react'
import { getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import { HAND_SIZE } from '../state/game'
import { CardLibrary } from './CardLibrary'
import { HandTray } from './HandTray'
import type { ScreenProps } from './types'

export function PickScreen({ state, dispatch }: ScreenProps) {
  const player = state.players[state.activePlayer]
  const result = useMemo(
    () => scoreHand(player.hand.map(getCard), { lokiDraw: player.lokiDraw }),
    [player.hand, player.lokiDraw],
  )
  return (
    <main className="screen">
      <nav className="player-tabs">
        {state.players.map((p, i) => (
          <button
            key={p.id}
            className={i === state.activePlayer ? 'active' : ''}
            onClick={() => dispatch({ type: 'selectPlayer', index: i })}
          >
            {p.name} ({p.hand.length}/{HAND_SIZE})
          </button>
        ))}
      </nav>
      <HandTray player={player} result={result} dispatch={dispatch} />
      <CardLibrary state={state} dispatch={dispatch} />
      <footer className="actions">
        <button onClick={() => dispatch({ type: 'backToSetup' })}>← Người chơi</button>
        <button className="primary" onClick={() => dispatch({ type: 'showResults' })}>Xem kết quả</button>
      </footer>
    </main>
  )
}
```

- [ ] **Step 6: Chạy test + typecheck, thấy PASS**

Run: `npm test && npx tsc`
Expected: PASS. (Angel + Magneto = 6 + 17 = 23.)

- [ ] **Step 7: Kiểm tra thủ công**

Run: `npm run dev` rồi mở link trên trình duyệt (thu hẹp cửa sổ ~375px để giả điện thoại): chọn 7 lá, thấy điểm đổi ngay; lá blank bị xám; lá transform xoay ngược; không có thanh cuộn ngang.

- [ ] **Step 8: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): pick screen with hand tray, live score and card library"
```

---

### Task 11: Màn Kết quả (xếp hạng + giải thích từng lá)

**Files:**
- Modify: `src/ui/ResultScreen.tsx`
- Test: `tests/ui/app.test.tsx` (thêm test)

**Interfaces:**
- Consumes: `scoreHand`, `HandResult`, `rankPlayers`, `getCard`.
- Produces: `ResultScreen` + `Breakdown({ result })`.

- [ ] **Step 1: Thêm test**

```tsx
describe('màn kết quả', () => {
  it('xếp hạng, đánh dấu người thắng và mở bảng giải thích', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Bắt đầu tính điểm'))
    fireEvent.click(screen.getByRole('button', { name: 'Angel' }))
    fireEvent.click(screen.getByRole('tab', { name: /VILLAIN/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Magneto' }))
    fireEvent.click(screen.getByText('Xem kết quả'))
    const first = screen.getAllByRole('listitem')[0]
    expect(first.textContent).toContain('Người 1')
    expect(first.textContent).toContain('23')
    expect(first.className).toContain('winner')
    fireEvent.click(screen.getByText('Người 1'))
    expect(screen.getByText('Tổng')).toBeTruthy()
    expect(screen.getByText('Magneto')).toBeTruthy()
  })

  it('người chưa có VILLAIN được 0 và có giải thích', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Bắt đầu tính điểm'))
    fireEvent.click(screen.getByRole('button', { name: 'Angel' }))
    fireEvent.click(screen.getByText('Xem kết quả'))
    fireEvent.click(screen.getByText('Người 1'))
    expect(screen.getByText(/Thiếu HERO\/ALLY hoặc VILLAIN hợp lệ → 0 điểm \(nếu hợp lệ sẽ là 6\)/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Chạy test, thấy FAIL**

Run: `npx vitest run tests/ui/app.test.tsx`
Expected: FAIL — màn kết quả chưa có danh sách.

- [ ] **Step 3: Viết `src/ui/ResultScreen.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { getCard } from '../data'
import { scoreHand } from '../engine/optimize'
import type { HandResult } from '../engine/score'
import { rankPlayers } from '../state/game'
import type { ScreenProps } from './types'

function Breakdown({ result }: { result: HandResult }) {
  return (
    <div className="breakdown">
      {!result.valid && result.cards.length > 0 && (
        <p className="warning">Thiếu HERO/ALLY hoặc VILLAIN hợp lệ → 0 điểm (nếu hợp lệ sẽ là {result.rawTotal}).</p>
      )}
      <table>
        <thead>
          <tr><th>Lá</th><th>Power</th><th>Bonus</th><th>Điểm</th></tr>
        </thead>
        <tbody>
          {result.cards.map(c => (
            <tr key={c.id} className={c.blanked ? 'is-blanked' : ''}>
              <td>
                {c.name}
                {c.transformed && ' (transform)'}
                {c.blanked && ` — BLANK${c.blankedBy && c.blankedBy !== c.id ? ` bởi ${getCard(c.blankedBy).name}` : ''}`}
              </td>
              <td>{c.blanked ? '—' : c.powerStar ? '*' : c.power}</td>
              <td>{c.bonuses.map(b => <div key={b.reason}>{b.reason}</div>)}</td>
              <td>{c.total}</td>
            </tr>
          ))}
          {result.extras.map(b => (
            <tr key={b.reason}><td colSpan={3}>{b.reason}</td><td>{b.points}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}>Tổng</td><td>{result.total}</td></tr>
        </tfoot>
      </table>
      {result.choiceLabels.length > 0 && <p className="choices">Lựa chọn đã dùng: {result.choiceLabels.join('; ')}</p>}
    </div>
  )
}

export function ResultScreen({ state, dispatch }: ScreenProps) {
  const [open, setOpen] = useState<string | null>(null)
  const results = useMemo(
    () => new Map(state.players.map(p => [p.id, scoreHand(p.hand.map(getCard), { lokiDraw: p.lokiDraw })])),
    [state.players],
  )
  const ranked = rankPlayers(state.players.map(p => ({ id: p.id, total: results.get(p.id)!.total })))
  const nameOf = (id: string) => state.players.find(p => p.id === id)!.name

  return (
    <main className="screen">
      <h1>Kết quả</h1>
      <ol className="ranking">
        {ranked.map(({ id, rank, total, winner }) => (
          <li key={id} className={winner ? 'winner' : ''}>
            <button aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
              <span>#{rank}</span>
              <span>{nameOf(id)}</span>
              {winner && <span aria-label="Thắng">🏆</span>}
              <strong>{total}</strong>
            </button>
            {open === id && <Breakdown result={results.get(id)!} />}
          </li>
        ))}
      </ol>
      <footer className="actions">
        <button onClick={() => dispatch({ type: 'editHands' })}>Sửa tay bài</button>
        <button
          className="primary"
          onClick={() => {
            if (window.confirm('Bắt đầu ván mới? Tay bài hiện tại sẽ bị xóa.')) dispatch({ type: 'newGame' })
          }}
        >
          Ván mới
        </button>
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: Chạy test + typecheck + build, thấy PASS**

Run: `npm test && npx tsc && npm run build`
Expected: PASS.

- [ ] **Step 5: Kiểm tra thủ công**

`npm run dev`: nhập đúng ví dụ trang 7 cho Người 1 → kết quả 81, bảng giải thích ghi "Vision: Strength + Flight"; tạo hòa điểm giữa 2 người → cả hai có 🏆.

- [ ] **Step 6: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): result screen with ranking and per-card breakdown"
```

---

### Task 12: Deploy lên GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm test`, `npm run build`, `vite.config.ts` đọc `BASE_PATH`.

- [ ] **Step 1: Viết `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Kiểm tra build với base path giống production**

Run (bash): `BASE_PATH=/marvel-remix-scorer/ npm run build && npx vite preview --base /marvel-remix-scorer/`
Expected: mở `http://localhost:4173/marvel-remix-scorer/` thấy app, ảnh lá hiện đủ.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: build, test and deploy to GitHub Pages"
```

- [ ] **Step 4: DỪNG — hỏi người dùng trước khi tạo repo/push**

Tạo repo GitHub và push là thao tác công khai ra ngoài. Hỏi người dùng: tên repo (đề xuất `marvel-remix-scorer`), public/private (GitHub Pages miễn phí cần public với tài khoản free). Chỉ khi được đồng ý mới chạy:

```bash
gh repo create <tên-repo> --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/<tên-repo>/pages -f build_type=workflow
gh run watch
```
Expected: workflow xanh; `gh api repos/{owner}/<tên-repo>/pages --jq .html_url` trả về link web. Mở link trên điện thoại để kiểm tra.
