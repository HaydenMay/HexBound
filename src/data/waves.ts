import type { WaveDef } from '../sim/types'

export const WAVES: WaveDef[] = [
  { groups: [{ enemy: 'militia', count: 6, interval: 1.6, delay: 1 }], reward: 20 },
  { groups: [{ enemy: 'militia', count: 10, interval: 1.3, delay: 1 }], reward: 25 },
  {
    groups: [
      { enemy: 'militia', count: 8, interval: 1.3, delay: 1 },
      { enemy: 'runner', count: 4, interval: 1.6, delay: 6 }
    ],
    reward: 30
  },
  {
    groups: [
      { enemy: 'militia', count: 10, interval: 1.2, delay: 1 },
      { enemy: 'runner', count: 8, interval: 1.3, delay: 5 }
    ],
    reward: 35
  },
  {
    groups: [
      { enemy: 'militia', count: 14, interval: 1.0, delay: 1 },
      { enemy: 'runner', count: 10, interval: 1.1, delay: 5 }
    ],
    reward: 40
  },
  {
    groups: [
      { enemy: 'militia', count: 16, interval: 0.9, delay: 1 },
      { enemy: 'runner', count: 12, interval: 1.0, delay: 5 }
    ],
    reward: 45
  },
  {
    groups: [
      { enemy: 'militia', count: 20, interval: 0.8, delay: 1 },
      { enemy: 'runner', count: 16, interval: 0.9, delay: 5 }
    ],
    reward: 55
  },
  {
    groups: [
      { enemy: 'militia', count: 24, interval: 0.7, delay: 1 },
      { enemy: 'runner', count: 24, interval: 0.7, delay: 4 }
    ],
    reward: 80
  }
]
