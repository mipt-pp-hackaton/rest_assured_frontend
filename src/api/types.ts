import { z } from 'zod'
import type {
  HttpMethodSchema,
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
  ValidationErrorSchema,
  HTTPValidationErrorSchema,
} from './schemas'

/**
 * TS types inferred from the Zod schemas in `./schemas`.
 * Kept type-only so this module emits nothing at runtime.
 */

export type HttpMethod = z.infer<typeof HttpMethodSchema>
export type TokenPair = z.infer<typeof TokenPairSchema>
export type UserCreate = z.infer<typeof UserCreateSchema>
/**
 * Input shape for creating a user. SECURITY: `is_superuser` is stripped at the
 * type level via `Omit`, so no caller can pass it (not even `false`) — a normal
 * registration cannot self-grant superuser. The schema still applies its
 * `is_superuser` default at parse time on the server side.
 */
export type UserCreateInput = Omit<
  z.input<typeof UserCreateSchema>,
  'is_superuser'
>
export type UserRead = z.infer<typeof UserReadSchema>
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>
export type ServiceCreate = z.infer<typeof ServiceCreateSchema>
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>
export type ServiceRead = z.infer<typeof ServiceReadSchema>
export type ServiceSummaryItem = z.infer<typeof ServiceSummaryItemSchema>
export type ServiceMetricsResponse = z.infer<typeof ServiceMetricsResponseSchema>
export type TimeseriesBucket = z.infer<typeof TimeseriesBucketSchema>
export type IncidentRead = z.infer<typeof IncidentReadSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type HTTPValidationError = z.infer<typeof HTTPValidationErrorSchema>
