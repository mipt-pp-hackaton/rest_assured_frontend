import { describe, it, expect, expectTypeOf } from 'vitest'
// Runtime import of the schemas barrel that src/api/types should be derived
// from. types.ts is type-only, so we anchor a runtime assertion on schemas to
// guarantee this suite genuinely FAILS while the module is absent (RED).
import * as schemas from '../api/schemas'
import type {
  TokenPair,
  UserCreate,
  UserRead,
  RefreshRequest,
  ServiceCreate,
  ServiceUpdate,
  ServiceRead,
  ServiceSummaryItem,
  ServiceMetricsResponse,
  TimeseriesBucket,
  IncidentRead,
  HTTPValidationError,
  HttpMethod,
} from '../api/types'

describe('api/types re-exports', () => {
  it('the schemas barrel exposes every expected schema export', () => {
    for (const name of [
      'TokenPairSchema',
      'UserCreateSchema',
      'UserReadSchema',
      'RefreshRequestSchema',
      'ServiceCreateSchema',
      'ServiceUpdateSchema',
      'ServiceReadSchema',
      'ServiceSummaryItemSchema',
      'ServiceMetricsResponseSchema',
      'TimeseriesBucketSchema',
      'IncidentReadSchema',
      'HTTPValidationErrorSchema',
      'HttpMethodSchema',
    ]) {
      expect(schemas).toHaveProperty(name)
      expect(typeof (schemas as Record<string, unknown>)[name]).not.toBe('undefined')
    }
  })

  it('HttpMethod is the union of allowed verbs', () => {
    expectTypeOf<HttpMethod>().toEqualTypeOf<
      'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'
    >()
  })

  it('domain types are exported with the expected shape', () => {
    expectTypeOf<TokenPair>().toMatchObjectType<{
      access_token: string
      refresh_token: string
    }>()
    expectTypeOf<ServiceRead>().toHaveProperty('expected_status')
    expectTypeOf<ServiceRead['id']>().toEqualTypeOf<number>()
    expectTypeOf<UserCreate>().toHaveProperty('email')
    expectTypeOf<UserRead>().toHaveProperty('id')
    expectTypeOf<RefreshRequest>().toHaveProperty('refresh_token')
    expectTypeOf<ServiceCreate>().toHaveProperty('url')
    expectTypeOf<ServiceUpdate>().toHaveProperty('url')
    expectTypeOf<ServiceSummaryItem>().toHaveProperty('service_id')
    expectTypeOf<ServiceMetricsResponse>().toHaveProperty('sla_pct')
    expectTypeOf<TimeseriesBucket>().toHaveProperty('bucket_start')
    expectTypeOf<IncidentRead>().toHaveProperty('closed_at')
    expectTypeOf<HTTPValidationError>().toHaveProperty('detail')
  })
})
