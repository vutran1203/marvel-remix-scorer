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
    <>
      <span className="card-name" aria-hidden="true" title={name}>{name}</span>
      <img
        className={`card-img ${transformed ? 'is-transformed' : ''} ${className}`}
        src={`${import.meta.env.BASE_URL}cards/${card.id}.webp`}
        alt={name}
        loading="lazy"
      />
    </>
  )
}
