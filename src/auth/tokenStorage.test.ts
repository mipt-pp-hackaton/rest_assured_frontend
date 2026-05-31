import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from './tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    tokenStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('returns null for both getters when nothing is stored (no throw)', () => {
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('returns the tokens that were set', () => {
    tokenStorage.setTokens({ access: 'access-123', refresh: 'refresh-456' })

    expect(tokenStorage.getAccessToken()).toBe('access-123')
    expect(tokenStorage.getRefreshToken()).toBe('refresh-456')
  })

  it('persists tokens across a fresh read of the same backing store', () => {
    tokenStorage.setTokens({ access: 'persist-access', refresh: 'persist-refresh' })

    // Simulate a fresh read: re-read directly from the underlying localStorage,
    // proving the values were actually written through and persist.
    const keys = Object.keys(localStorage)
    const stored = keys.map((k) => localStorage.getItem(k))

    expect(stored).toContain('persist-access')
    expect(stored).toContain('persist-refresh')

    // And the public getters still surface them on a subsequent read.
    expect(tokenStorage.getAccessToken()).toBe('persist-access')
    expect(tokenStorage.getRefreshToken()).toBe('persist-refresh')
  })

  it('clear() makes both getters return null', () => {
    tokenStorage.setTokens({ access: 'a', refresh: 'r' })
    expect(tokenStorage.getAccessToken()).toBe('a')

    tokenStorage.clear()

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('overwrites previously stored tokens when set again', () => {
    tokenStorage.setTokens({ access: 'old-a', refresh: 'old-r' })
    tokenStorage.setTokens({ access: 'new-a', refresh: 'new-r' })

    expect(tokenStorage.getAccessToken()).toBe('new-a')
    expect(tokenStorage.getRefreshToken()).toBe('new-r')
  })

  it('falls back to in-memory storage when localStorage throws / is unavailable', () => {
    // Simulate a hostile environment (e.g. Safari private mode) where
    // localStorage access throws.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage unavailable')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable')
    })

    expect(() => tokenStorage.setTokens({ access: 'mem-a', refresh: 'mem-r' })).not.toThrow()
    expect(tokenStorage.getAccessToken()).toBe('mem-a')
    expect(tokenStorage.getRefreshToken()).toBe('mem-r')

    expect(() => tokenStorage.clear()).not.toThrow()
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })
})
