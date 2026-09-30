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
