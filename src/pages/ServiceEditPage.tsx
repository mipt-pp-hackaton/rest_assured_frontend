import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { getService, updateService } from '../api/servicesApi'
import { ApiError } from '../api/errors'
import {
  ServiceForm,
  type ServiceFormErrors,
  type ServiceFormValues,
} from '../features/services/ServiceForm'
import type { ServiceUpdate } from '../api/types'
import { mapDetailToFieldErrors } from './serviceFormErrors'

/**
 * Edit route for a monitored service. Reads the `:id` route param, fetches the
 * existing service (GET /api/services/{id}) to pre-populate the shared
 * ServiceForm in edit mode, then PATCHes ONLY the changed keys (diffed by the
 * form). On success it navigates to the detail page "/services/{id}"; on a 422
 * it maps the validation detail onto field errors and stays on the page.
 */
export default function ServiceEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)

  const [serverErrors, setServerErrors] = useState<ServiceFormErrors>({})

  const serviceQuery = useQuery({
    queryKey: ['service', numericId],
    queryFn: () => getService(numericId),
    enabled: Number.isInteger(numericId) && numericId > 0,
  })

  const mutation = useMutation({
    mutationFn: (patch: ServiceUpdate) => updateService(numericId, patch),
    onSuccess: () => {
      navigate(`/services/${numericId}`)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.detail) {
        setServerErrors(mapDetailToFieldErrors(err.detail))
      }
    },
  })

  function handleSubmit(patch: Partial<ServiceFormValues>) {
    setServerErrors({})
    mutation.mutate(patch as ServiceUpdate)
  }

  return (
    <div data-testid="service-edit-page">
      {serviceQuery.isPending ? (
        <div data-testid="service-edit-loading">Loading service…</div>
      ) : serviceQuery.isError ? (
        <div data-testid="service-edit-error">Could not load service.</div>
      ) : (
        <ServiceForm
          mode="edit"
          onSubmit={handleSubmit}
          errors={serverErrors}
          submitLabel="Save"
          initialValues={{
            name: serviceQuery.data.name,
            url: serviceQuery.data.url,
            http_method: serviceQuery.data.http_method,
            interval_ms: serviceQuery.data.interval_ms,
            expected_status: serviceQuery.data.expected_status,
            is_active: serviceQuery.data.is_active,
          }}
        />
      )}
    </div>
  )
}
