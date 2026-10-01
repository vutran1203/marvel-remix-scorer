import { pairs } from '../engine/combinatorics'
import {
  NONE, applyDouble, combine, countTags, countType, faceTags, findActive, forEachTag, forEachType,
  hasName, hasTypeWithTag, makeBonus, mutantHeroes, when, withUrbanLocation, type TagPick,
} from '../engine/helpers'
import { STAGE, type LiveCard, type Option, type Tag } from '../engine/types'
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
              label: (cards: LiveCard[]) => {
                const name = cards.find(c => c.def.id === d.id)?.face.name ?? d.name
                return `Rogue: chép ${name}${tag ? ` + ${tag}` : ''}`
              },
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
