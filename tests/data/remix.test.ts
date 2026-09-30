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
