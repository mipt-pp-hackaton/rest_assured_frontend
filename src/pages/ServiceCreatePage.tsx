import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
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
    // Non-422 failures (e.g. 500) surface via the global toast with this copy;
    // 422s additionally map onto the form fields below.
    meta: { errorMessage: 'Could not create the service.' },
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
    <div data-testid="service-create-page" className="page page--narrow">
      <header className="page__header">
        <Link to="/services" className="back-link">
          ← Services
        </Link>
        <h1>New service</h1>
        <p className="page__subtitle">Add an endpoint to monitor.</p>
      </header>
      <div className="panel">
        <ServiceForm
          mode="create"
          onSubmit={handleSubmit}
          errors={serverErrors}
          submitLabel="Create"
        />
      </div>
    </div>
  )
}
