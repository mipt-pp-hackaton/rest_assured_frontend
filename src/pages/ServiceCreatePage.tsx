import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createService } from '../api/servicesApi'
import { ApiError } from '../api/errors'
import {
  ServiceForm,
  type ServiceFormErrors,
  type ServiceFormValues,
} from '../features/services/ServiceForm'
import type { ServiceCreate } from '../api/types'
import { mapDetailToFieldErrors } from './serviceFormErrors'

/**
 * Create route for a monitored service. Renders the shared ServiceForm in
 * create mode and owns the POST /api/services/ mutation. On success (201) it
 * navigates to the list at "/services"; on a 422 it maps the validation detail
 * onto the matching field errors and stays on the page.
 */
export default function ServiceCreatePage() {
  const navigate = useNavigate()
  const [serverErrors, setServerErrors] = useState<ServiceFormErrors>({})

  const mutation = useMutation({
    mutationFn: (body: ServiceCreate) => createService(body),
    onSuccess: () => {
      navigate('/services')
    },
    onError: (err) => {
      if (err instanceof ApiError && err.detail) {
        setServerErrors(mapDetailToFieldErrors(err.detail))
      }
    },
  })

  function handleSubmit(values: Partial<ServiceFormValues>) {
    setServerErrors({})
    mutation.mutate(values as ServiceCreate)
  }

  return (
    <div data-testid="service-create-page">
      <ServiceForm
        mode="create"
        onSubmit={handleSubmit}
        errors={serverErrors}
        submitLabel="Create"
      />
    </div>
  )
}
