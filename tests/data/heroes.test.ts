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

  it('nhãn Rogue ghi tên mặt đang hiển thị của lá bị chép', () => {
    const r = play(['rogue', 'bruce-banner', 'she-hulk', 'abomination'])
    expect(cardOf(r, 'rogue').power).toBe(13)
    expect(r.choiceLabels).toEqual(['Rogue: chép Hulk + Gamma'])
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
