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
