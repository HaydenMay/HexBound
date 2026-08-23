import type { WaveDef } from '../sim/types'

export const WAVES: WaveDef[] = [
  { groups: [{ enemy: 'militia', count: 6, interval: 1.6, delay: 1 }], reward: 20 },
  { groups: [{ enemy: 'militia', count: 10, interval: 1.3, delay: 1 }], reward: 25 },
  {
    groups: [
      { enemy: 'knight', count: 2, interval: 4, delay: 2 },
      { enemy: 'militia', count: 8, interval: 1.2, delay: 1 }
    ],
    reward: 30
  },
  {
    groups: [
      { enemy: 'priest', count: 3, interval: 3, delay: 2 },
      { enemy: 'militia', count: 8, interval: 1.1, delay: 1 },
      { enemy: 'runner', count: 6, interval: 1.2, delay: 8 }
    ],
    reward: 35
  },
  {
    groups: [
      { enemy: 'hunter', count: 3, interval: 2.5, delay: 2 },
      { enemy: 'runner', count: 10, interval: 0.9, delay: 4 }
    ],
    reward: 40
  },
  {
    groups: [
      { enemy: 'mage', count: 3, interval: 3, delay: 2 },
      { enemy: 'knight', count: 4, interval: 3, delay: 5 },
      { enemy: 'militia', count: 10, interval: 0.9, delay: 1 }
    ],
    reward: 45
  },
  {
    groups: [
      { enemy: 'priest', count: 4, interval: 2, delay: 1 },
      { enemy: 'hunter', count: 4, interval: 1.8, delay: 6 },
      { enemy: 'runner', count: 14, interval: 0.8, delay: 3 }
    ],
    reward: 55
  },
  {
    groups: [
      { enemy: 'militia', count: 20, interval: 0.6, delay: 1 },
      { enemy: 'knight', count: 6, interval: 2, delay: 2 },
      { enemy: 'runner', count: 16, interval: 0.7, delay: 12 },
      { enemy: 'mage', count: 4, interval: 2.5, delay: 8 },
      { enemy: 'priest', count: 3, interval: 2.5, delay: 16 }
    ],
    reward: 90
  }
]
