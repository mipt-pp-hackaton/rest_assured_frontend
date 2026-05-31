import { z } from 'zod'

/**
 * Zod v4 schemas modeled on the rest-assured backend OpenAPI spec.
 * Inferred TS types are re-exported from `./types`.
 */

export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'HEAD',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
])

export const TokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default('bearer'),
})

export const RefreshRequestSchema = z.object({
  refresh_token: z.string().max(2048),
})

export const UserCreateSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(72),
  is_superuser: z.boolean().default(false),
})

export const UserReadSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  is_active: z.boolean(),
  is_superuser: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ServiceCreateSchema = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2048),
  name: z.string().max(255),
  http_method: HttpMethodSchema.default('GET'),
  interval_ms: z.number().int().min(1000).default(60000),
  expected_status: z.number().int().nullable().optional(),
  is_active: z.boolean().default(true),
  // Emails notified about this service's incidents. Optional; defaults to [].
  owner_emails: z.array(z.email()).optional(),
})

export const ServiceUpdateSchema = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  http_method: HttpMethodSchema.nullable().optional(),
  interval_ms: z.number().int().min(1000).nullable().optional(),
  expected_status: z.number().int().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  owner_emails: z.array(z.email()).nullable().optional(),
})

export const ServiceReadSchema = z.object({
  id: z.number().int(),
  url: z.string(),
  name: z.string(),
  http_method: z.string(),
  interval_ms: z.number().int(),
  expected_status: z.number().int().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  // Lenient on read (don't reject a non-email the server might return).
  owner_emails: z.array(z.string()).optional(),
})

export const ServiceSummaryItemSchema = z.object({
  service_id: z.number().int(),
  name: z.string(),
  url: z.string(),
  is_active: z.boolean(),
  current_uptime_seconds: z.number().int(),
  sla_pct: z.number(),
  last_check_at: z.string().nullable(),
  last_check_is_up: z.boolean().nullable(),
})

export const ServiceMetricsResponseSchema = z.object({
  service_id: z.number().int(),
  current_uptime_seconds: z.number().int(),
  sla_pct: z.number(),
  computed_at: z.string(),
})

export const TimeseriesBucketSchema = z.object({
  bucket_start: z.string(),
  checks_total: z.number().int(),
  checks_up: z.number().int(),
  up_ratio: z.number(),
  latency_avg_ms: z.number().nullable(),
  latency_p95_ms: z.number().nullable(),
})

export const IncidentReadSchema = z.object({
  id: z.number().int(),
  service_id: z.number().int(),
  service_name: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
  last_error: z.string().nullable(),
  sla_breach: z.boolean(),
  duration_seconds: z.number().int().nullable(),
})

export const ValidationErrorSchema = z.object({
  loc: z.array(z.union([z.string(), z.number().int()])),
  msg: z.string(),
  type: z.string(),
})

export const HTTPValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorSchema).optional(),
})
