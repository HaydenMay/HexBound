import { describe, expect, it } from 'vitest'
import { APP_NAME, APP_TAGLINE } from './meta'

describe('game metadata', () => {
  it('exposes the app identity', () => {
    expect(APP_NAME).toBe('HexBound')
    expect(APP_TAGLINE.trim().length).toBeGreaterThan(0)
  })
})
