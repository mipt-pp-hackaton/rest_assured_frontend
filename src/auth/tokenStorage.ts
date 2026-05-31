const ACCESS_KEY = 'auth.accessToken'
const REFRESH_KEY = 'auth.refreshToken'

interface Tokens {
  access: string
  refresh: string
}

// In-memory fallback used when localStorage is unavailable or throws
// (e.g. Safari private mode, disabled storage, quota errors).
const memory = new Map<string, string>()

function readItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    // localStorage threw — fall through to in-memory store.
  }
  return memory.has(key) ? (memory.get(key) ?? null) : null
}

function writeItem(key: string, value: string): void {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    // Persisted to memory above; ignore localStorage failure.
  }
}

function removeItem(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // Already removed from memory; ignore localStorage failure.
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return readItem(ACCESS_KEY)
  },
  getRefreshToken(): string | null {
    return readItem(REFRESH_KEY)
  },
  setTokens({ access, refresh }: Tokens): void {
    writeItem(ACCESS_KEY, access)
    writeItem(REFRESH_KEY, refresh)
  },
  clear(): void {
    removeItem(ACCESS_KEY)
    removeItem(REFRESH_KEY)
  },
}
