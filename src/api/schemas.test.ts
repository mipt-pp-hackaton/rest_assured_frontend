import { describe, it, expect } from 'vitest'
import {
  TokenPairSchema,
  UserCreateSchema,
  UserReadSchema,
  RefreshRequestSchema,
  ServiceCreateSchema,
  ServiceUpdateSchema,
  ServiceReadSchema,
  ServiceSummaryItemSchema,
  ServiceMetricsResponseSchema,
  TimeseriesBucketSchema,
  IncidentReadSchema,
  HTTPValidationErrorSchema,
  HttpMethodSchema,
} from '../api/schemas'

describe('HttpMethodSchema', () => {
  it('accepts each allowed HTTP verb', () => {
    for (const m of ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      expect(HttpMethodSchema.safeParse(m).success).toBe(true)
    }
  })

  it('rejects a value outside the enum', () => {
    const result = HttpMethodSchema.safeParse('TRACE')
    expect(result.success).toBe(false)
  })
})

describe('ServiceReadSchema', () => {
  const validServiceRead = {
    id: 1,
    url: 'https://example.com/health',
    name: 'Example API',
    http_method: 'GET',
    interval_ms: 60000,
    expected_status: 200,
    is_active: true,
    created_at: '2026-05-27T12:00:00Z',
  }

  it('parses a valid ServiceRead payload', () => {
    const result = ServiceReadSchema.safeParse(validServiceRead)
    expect(result.success).toBe(true)
  })

  it('allows a null expected_status', () => {
    const result = ServiceReadSchema.safeParse({
      ...validServiceRead,
      expected_status: null,
    })
    expect(result.success).toBe(true)
  })

  it('allows expected_status to be omitted', () => {
    const { expected_status: _omit, ...rest } = validServiceRead
    const result = ServiceReadSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('fails when a required field (url) is missing', () => {
    const { url: _omit, ...rest } = validServiceRead
    const result = ServiceReadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

describe('ServiceCreateSchema', () => {
  it('parses a minimal valid payload with only url and name', () => {
    const result = ServiceCreateSchema.safeParse({
      url: 'https://example.com',
      name: 'Example',
    })
    expect(result.success).toBe(true)
  })

  it('fails when url is missing and reports an issue on url', () => {
    const result = ServiceCreateSchema.safeParse({ name: 'Example' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('url')
    }
  })

  it('fails when name is missing and reports an issue on name', () => {
    const result = ServiceCreateSchema.safeParse({ url: 'https://example.com' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('name')
    }
  })

  it('fails when http_method is outside the enum', () => {
    const result = ServiceCreateSchema.safeParse({
      url: 'https://example.com',
      name: 'Example',
      http_method: 'CONNECT',
    })
    expect(result.success).toBe(false)
  })
})

describe('ServiceUpdateSchema', () => {
  it('parses an empty object (all fields optional)', () => {
    expect(ServiceUpdateSchema.safeParse({}).success).toBe(true)
  })

  it('allows nullable fields to be null', () => {
    const result = ServiceUpdateSchema.safeParse({
      url: null,
      name: null,
      http_method: null,
      interval_ms: null,
      expected_status: null,
      is_active: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid http_method', () => {
    const result = ServiceUpdateSchema.safeParse({ http_method: 'FOO' })
    expect(result.success).toBe(false)
  })
})

describe('UserCreateSchema', () => {
  it('accepts a password of length 8 (lower bound)', () => {
    const result = UserCreateSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a password of length 72 (upper bound)', () => {
    const result = UserCreateSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(72),
    })
    expect(result.success).toBe(true)
  })

  it('rejects a password shorter than 8', () => {
    const result = UserCreateSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('password')
    }
  })

  it('rejects a password longer than 72', () => {
    const result = UserCreateSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(73),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('password')
    }
  })

  it('rejects an invalid email', () => {
    const result = UserCreateSchema.safeParse({
      email: 'not-an-email',
      password: '12345678',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('email')
    }
  })
})

describe('UserReadSchema', () => {
  it('parses a representative valid payload', () => {
    const result = UserReadSchema.safeParse({
      id: 42,
      email: 'user@example.com',
      is_active: true,
      is_superuser: false,
      created_at: '2026-05-27T12:00:00Z',
      updated_at: '2026-05-27T13:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('fails when id is missing', () => {
    const result = UserReadSchema.safeParse({
      email: 'user@example.com',
      is_active: true,
      is_superuser: false,
      created_at: '2026-05-27T12:00:00Z',
      updated_at: '2026-05-27T13:00:00Z',
    })
    expect(result.success).toBe(false)
  })
})

describe('TokenPairSchema', () => {
  it('parses a valid token pair and defaults token_type to bearer', () => {
    const result = TokenPairSchema.safeParse({
      access_token: 'access.jwt.token',
      refresh_token: 'refresh.jwt.token',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.token_type).toBe('bearer')
    }
  })

  it('fails when refresh_token is missing', () => {
    const result = TokenPairSchema.safeParse({ access_token: 'a' })
    expect(result.success).toBe(false)
  })
})

describe('RefreshRequestSchema', () => {
  it('parses a valid refresh request', () => {
    expect(
      RefreshRequestSchema.safeParse({ refresh_token: 'refresh.jwt.token' }).success,
    ).toBe(true)
  })

  it('fails when refresh_token is missing', () => {
    expect(RefreshRequestSchema.safeParse({}).success).toBe(false)
  })
})

describe('ServiceSummaryItemSchema', () => {
  it('parses a payload with nullable last_check fields populated', () => {
    const result = ServiceSummaryItemSchema.safeParse({
      service_id: 1,
      name: 'Example',
      url: 'https://example.com',
      is_active: true,
      current_uptime_seconds: 3600,
      sla_pct: 99.95,
      last_check_at: '2026-05-27T12:00:00Z',
      last_check_is_up: true,
    })
    expect(result.success).toBe(true)
  })

  it('parses a payload with null last_check fields', () => {
    const result = ServiceSummaryItemSchema.safeParse({
      service_id: 1,
      name: 'Example',
      url: 'https://example.com',
      is_active: false,
      current_uptime_seconds: 0,
      sla_pct: 0,
      last_check_at: null,
      last_check_is_up: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('ServiceMetricsResponseSchema', () => {
  it('parses a valid metrics payload', () => {
    const result = ServiceMetricsResponseSchema.safeParse({
      service_id: 1,
      current_uptime_seconds: 12345,
      sla_pct: 98.5,
      computed_at: '2026-05-27T12:00:00Z',
    })
    expect(result.success).toBe(true)
  })
})

describe('TimeseriesBucketSchema', () => {
  it('parses a bucket with numeric latency values', () => {
    const result = TimeseriesBucketSchema.safeParse({
      bucket_start: '2026-05-27T12:00:00Z',
      checks_total: 60,
      checks_up: 59,
      up_ratio: 0.9833,
      latency_avg_ms: 120.5,
      latency_p95_ms: 240.0,
    })
    expect(result.success).toBe(true)
  })

  it('parses a bucket with null latency values', () => {
    const result = TimeseriesBucketSchema.safeParse({
      bucket_start: '2026-05-27T12:00:00Z',
      checks_total: 0,
      checks_up: 0,
      up_ratio: 0,
      latency_avg_ms: null,
      latency_p95_ms: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('IncidentReadSchema', () => {
  it('parses an open incident with null closed_at and last_error', () => {
    const result = IncidentReadSchema.safeParse({
      id: 1,
      service_id: 10,
      service_name: 'Example',
      opened_at: '2026-05-27T12:00:00Z',
      closed_at: null,
      last_error: null,
      sla_breach: false,
      duration_seconds: null,
    })
    expect(result.success).toBe(true)
  })

  it('parses a closed incident with populated nullable fields', () => {
    const result = IncidentReadSchema.safeParse({
      id: 2,
      service_id: 10,
      service_name: 'Example',
      opened_at: '2026-05-27T12:00:00Z',
      closed_at: '2026-05-27T12:30:00Z',
      last_error: 'Connection timed out',
      sla_breach: true,
      duration_seconds: 1800,
    })
    expect(result.success).toBe(true)
  })
})

describe('HTTPValidationErrorSchema', () => {
  it('parses a FastAPI-style validation error payload', () => {
    const result = HTTPValidationErrorSchema.safeParse({
      detail: [
        {
          loc: ['body', 'url'],
          msg: 'field required',
          type: 'value_error.missing',
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('parses a payload where detail is omitted', () => {
    expect(HTTPValidationErrorSchema.safeParse({}).success).toBe(true)
  })
})
