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
  /** Rỗng = không cần hiển thị. Dạng hàm: tính từ tay bài đã giải (vd. tên mặt sau transform). */
  label: string | ((cards: LiveCard[]) => string)
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
