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
