import type { Category } from './types'

export const CATEGORIES: Category[] = [
  {
    id: 'buehne-konzerte',
    label: 'Bühne & Konzerte',
    icon: '🎤',
    description: 'Theater, Chor, Impro & Konzertabende',
  },
  {
    id: 'tanz',
    label: 'Tanz',
    icon: '💃',
    description: 'Salsa, Forró, Ecstatic & Co.',
  },
  {
    id: 'singles-dating',
    label: 'Singles & Dating',
    icon: '💞',
    description: 'Speed-Dating, Barhopping & Partnersuche',
  },
  {
    id: 'begegnungen',
    label: 'Begegnungen',
    icon: '🤝',
    description: 'Dinner, Mixer & lokales Kennenlernen',
  },
  {
    id: 'sport',
    label: 'Sport',
    icon: '🏃',
    description: 'Berg, Velo, Wassersport & Outdoor',
  },
  {
    id: 'konferenzen',
    label: 'Konferenzen',
    icon: '🎙',
    description: 'Bitcoin, FIRE, Nomad & Libertäres',
  },
  {
    id: 'festivals',
    label: 'Festivals',
    icon: '🎪',
    description: 'Mehrtages-Musik & -Kultur',
  },
  {
    id: 'retreats-austausch',
    label: 'Retreats & Austausch',
    icon: '🌿',
    description: 'Bewusstseinsarbeit, Workcamps & Sprachreisen',
  },
]

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}
