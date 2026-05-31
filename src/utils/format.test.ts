import { describe, it, expect } from 'vitest'
import {
  formatUptime,
  formatSlaPct,
  formatDateTime,
  formatLatency,
  incidentStatus,
} from './format'

describe('formatUptime', () => {
  it('formats 3661 seconds as "1h 1m 1s"', () => {
    expect(formatUptime(3661)).toBe('1h 1m 1s')
  })

  it('formats 0 seconds as "0s"', () => {
    expect(formatUptime(0)).toBe('0s')
  })
})

describe('formatSlaPct', () => {
  it('formats with 2 decimal places', () => {
    expect(formatSlaPct(99.954)).toBe('99.95%')
  })
})

describe('formatLatency', () => {
  it('returns em dash for null', () => {
    expect(formatLatency(null)).toBe('—')
  })

  it('formats numeric latency with " ms" suffix', () => {
    expect(formatLatency(12.3)).toBe('12.3 ms')
  })
})

describe('incidentStatus', () => {
  it('returns "open" when closed_at is null', () => {
    expect(incidentStatus({ closed_at: null })).toBe('open')
  })

  it('returns "resolved" when closed_at is an ISO timestamp', () => {
    expect(incidentStatus({ closed_at: '2026-05-27T10:00:00Z' })).toBe('resolved')
  })
})

describe('formatDateTime', () => {
  it('returns a deterministic UTC "YYYY-MM-DD HH:mm" string independent of machine timezone', () => {
    expect(formatDateTime('2026-05-27T14:05:09Z')).toBe('2026-05-27 14:05')
  })

  it('normalizes a timezone-offset input to UTC', () => {
    expect(formatDateTime('2026-05-27T14:05:09+02:00')).toBe('2026-05-27 12:05')
  })
})
